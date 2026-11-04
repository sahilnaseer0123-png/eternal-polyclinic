// GET  /api/staff/lab-reports   list + search (owner, reception, lab)
//      ?q= patient name, mobile, patient ID or test   ?status= pending|processing|ready
//      ?delivery= not_sent|queued|sent|delivered|read|failed   ?from= &to= (date registered)   ?page=
// POST /api/staff/lab-reports   { patientId, testName, sampleDate?, notes? }  (owner, lab) → status Pending

import { jsonResponse, randomHex, type CfPagesContext } from "../../_lib/clinic-store";
import { audit, clinicDateKey } from "../../_lib/db";
import { DATE_RE, bad, dateParam, readJson, staffGate } from "../../_lib/http";
import { maskPhone } from "../../_lib/patients";

const PAGE_SIZE = 30;

export function reportView(r: Record<string, unknown>, revealPhone: boolean) {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientCode: r.patient_code,
    patientName: r.patient_name,
    patientPhone: revealPhone ? r.patient_phone : maskPhone(String(r.patient_phone ?? "")),
    phoneVerified: r.phone_verified === 1,
    testName: r.test_name,
    sampleDate: r.sample_date,
    status: r.status,
    deliveryStatus: r.delivery_status,
    fileName: r.file_name,
    fileSize: r.file_size,
    hasFile: Boolean(r.file_key),
    uploadedAt: r.uploaded_at,
    readyAt: r.ready_at,
    lastSentAt: r.last_sent_at,
    deliveredAt: r.delivered_at,
    notes: r.notes,
    createdAt: r.created_at,
    lastError: r.last_error ?? null,
  };
}

export const REPORT_SELECT = `
  SELECT r.*, p.code AS patient_code, p.name AS patient_name, p.phone AS patient_phone, p.phone_verified,
    (SELECT n.error FROM notifications n WHERE n.kind = 'lab_report' AND n.ref_id = r.id ORDER BY n.id DESC LIMIT 1) AS last_error
  FROM lab_reports r JOIN patients p ON p.id = r.patient_id`;

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception", "lab"]);
  if (gate instanceof Response) return gate;
  const { db } = gate;
  const url = new URL(context.request.url);

  const where: string[] = [];
  const binds: unknown[] = [];
  const bind = (v: unknown) => {
    binds.push(v);
    return `?${binds.length}`;
  };

  const q = (url.searchParams.get("q") ?? "").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    const parts = [`p.name LIKE ${bind(`%${q.replace(/[%_]/g, "")}%`)}`, `r.test_name LIKE ${bind(`%${q.replace(/[%_]/g, "")}%`)}`];
    if (digits.length >= 4) parts.push(`p.phone LIKE ${bind(`%${digits}%`)}`);
    if (digits.length >= 1 && digits.length <= 6) parts.push(`p.id = ${bind(Number(digits))}`);
    where.push(`(${parts.join(" OR ")})`);
  }
  const status = url.searchParams.get("status");
  if (status && ["pending", "processing", "ready"].includes(status)) where.push(`r.status = ${bind(status)}`);
  const delivery = url.searchParams.get("delivery");
  if (delivery && ["not_sent", "queued", "sent", "delivered", "read", "failed"].includes(delivery)) {
    where.push(`r.delivery_status = ${bind(delivery)}`);
  }
  const from = dateParam(url, "from");
  const to = dateParam(url, "to");
  if (from) where.push(`r.created_date >= ${bind(from)}`);
  if (to) where.push(`r.created_date <= ${bind(to)}`);
  const patientId = Number(url.searchParams.get("patientId"));
  if (patientId > 0) where.push(`r.patient_id = ${bind(patientId)}`);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const total =
    (await db.prepare(`SELECT COUNT(*) AS n FROM lab_reports r JOIN patients p ON p.id = r.patient_id ${whereSql}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const { results } = await db
    .prepare(`${REPORT_SELECT} ${whereSql} ORDER BY r.updated_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`)
    .bind(...binds)
    .all<Record<string, unknown>>();
  const counts = await db
    .prepare(
      `SELECT
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) AS processing,
        SUM(CASE WHEN status = 'ready' THEN 1 ELSE 0 END) AS ready,
        SUM(CASE WHEN delivery_status IN ('delivered','read') THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN delivery_status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM lab_reports`,
    )
    .first<Record<string, number | null>>();

  return jsonResponse({
    ok: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    counts: Object.fromEntries(Object.entries(counts ?? {}).map(([k, v]) => [k, v ?? 0])),
    reports: results.map((r) => reportView(r, true)),
  });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "lab"]);
  if (gate instanceof Response) return gate;
  const { db, staff } = gate;
  const body = await readJson<{ patientId?: number; testName?: string; sampleDate?: string; notes?: string }>(context.request);
  if (!body) return bad("Invalid request.");
  const patient = await db.prepare("SELECT id, code FROM patients WHERE id = ?1").bind(Number(body.patientId)).first<{ id: number; code: string }>();
  if (!patient) return bad("Choose the patient first.");
  const testName = (body.testName ?? "").trim().replace(/\s+/g, " ");
  if (testName.length < 2 || testName.length > 120) return bad("Enter the test name (for example CBC, LFT, Lipid profile).");
  const today = clinicDateKey();
  const sampleDate = body.sampleDate && DATE_RE.test(body.sampleDate) ? body.sampleDate : today;
  if (sampleDate > today) return bad("Sample date can't be in the future.");

  const now = Date.now();
  const id = `LR-${today.replace(/-/g, "").slice(2)}-${randomHex(3).toUpperCase()}`;
  await db
    .prepare(
      `INSERT INTO lab_reports (id, patient_id, test_name, sample_date, status, notes, created_at, created_date, created_by, updated_at)
       VALUES (?1, ?2, ?3, ?4, 'pending', ?5, ?6, ?7, ?8, ?6)`,
    )
    .bind(id, patient.id, testName, sampleDate, body.notes?.trim() || null, now, today, staff.id)
    .run();
  await audit(db, staff.id, "lab.create", `report:${id}`, `${patient.code}: ${testName}`);
  const row = await db.prepare(`${REPORT_SELECT} WHERE r.id = ?1`).bind(id).first<Record<string, unknown>>();
  return jsonResponse({ ok: true, report: reportView(row!, true) }, 201);
}
