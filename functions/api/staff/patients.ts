// GET  /api/staff/patients   search the patient database (owner, reception; lab gets name/ID/phone lookup only)
//      ?q=  name, mobile or patient ID     ?phone=  exact 10-digit lookup (reception "already registered?")
//      ?from= &to=  registration date      ?service= doctor id or "lab"
//      ?apptStatus=  confirmed|arrived|in_consultation|completed|cancelled
//      ?reportStatus= pending|processing|ready|sent|delivered|failed      ?page=
// POST /api/staff/patients   { name, phone, area?, verified? }  find-or-create (no duplicates)

import { jsonResponse, type CfPagesContext } from "../../_lib/clinic-store";
import { audit } from "../../_lib/db";
import { bad, dateParam, readJson, staffGate } from "../../_lib/http";
import { cleanPhone, findOrCreatePatient, publicPatient, type PatientRow } from "../../_lib/patients";

const PAGE_SIZE = 25;
const APPT_STATUSES = ["confirmed", "arrived", "in_consultation", "completed", "cancelled"];
const REPORT_STATUSES = ["pending", "processing", "ready"];
const DELIVERY_STATUSES = ["sent", "delivered", "failed", "read", "queued", "not_sent"];

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception", "lab"]);
  if (gate instanceof Response) return gate;
  const { db, staff } = gate;
  const url = new URL(context.request.url);

  const where: string[] = [];
  const binds: unknown[] = [];
  const bind = (v: unknown) => {
    binds.push(v);
    return `?${binds.length}`;
  };

  const phone = url.searchParams.get("phone");
  if (phone) {
    const p = cleanPhone(phone);
    if (!p) return jsonResponse({ ok: true, patients: [], total: 0 });
    where.push(`p.phone = ${bind(p)}`);
  }

  const q = (url.searchParams.get("q") ?? "").trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    const codeMatch = /^(epp-?)?\d{1,6}$/i.test(q.replace(/\s/g, "")) && digits.length <= 6;
    const parts = [`p.name LIKE ${bind(`%${q.replace(/[%_]/g, "")}%`)}`];
    if (digits.length >= 4) parts.push(`p.phone LIKE ${bind(`%${digits}%`)}`);
    if (codeMatch) parts.push(`p.id = ${bind(Number(digits))}`);
    where.push(`(${parts.join(" OR ")})`);
  }

  if (staff.role !== "lab") {
    const from = dateParam(url, "from");
    const to = dateParam(url, "to");
    if (from) where.push(`p.created_date >= ${bind(from)}`);
    if (to) where.push(`p.created_date <= ${bind(to)}`);

    const service = url.searchParams.get("service");
    if (service === "lab") where.push(`EXISTS (SELECT 1 FROM lab_reports r WHERE r.patient_id = p.id)`);
    else if (service) where.push(`EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.doctor_id = ${bind(service)} AND a.deleted_at IS NULL)`);

    const apptStatus = url.searchParams.get("apptStatus");
    if (apptStatus && APPT_STATUSES.includes(apptStatus)) {
      where.push(`EXISTS (SELECT 1 FROM appointments a WHERE a.patient_id = p.id AND a.status = ${bind(apptStatus)} AND a.deleted_at IS NULL)`);
    }

    const reportStatus = url.searchParams.get("reportStatus");
    if (reportStatus && REPORT_STATUSES.includes(reportStatus)) {
      where.push(`EXISTS (SELECT 1 FROM lab_reports r WHERE r.patient_id = p.id AND r.status = ${bind(reportStatus)})`);
    } else if (reportStatus && DELIVERY_STATUSES.includes(reportStatus)) {
      where.push(`EXISTS (SELECT 1 FROM lab_reports r WHERE r.patient_id = p.id AND r.delivery_status = ${bind(reportStatus)})`);
    }
  } else if (!q && !phone) {
    // Lab staff look patients up; they don't browse the whole database.
    return jsonResponse({ ok: true, patients: [], total: 0, page: 1, pageSize: PAGE_SIZE });
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const total = (await db.prepare(`SELECT COUNT(*) AS n FROM patients p ${whereSql}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const { results } = await db
    .prepare(
      `SELECT p.*,
        (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id AND a.deleted_at IS NULL) AS visit_count,
        (SELECT MAX(a.date) FROM appointments a WHERE a.patient_id = p.id AND a.deleted_at IS NULL) AS last_visit,
        (SELECT COUNT(*) FROM lab_reports r WHERE r.patient_id = p.id) AS report_count
       FROM patients p ${whereSql}
       ORDER BY p.updated_at DESC
       LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    )
    .bind(...binds)
    .all<PatientRow & { visit_count: number; last_visit: string | null; report_count: number }>();

  return jsonResponse({
    ok: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    patients: results.map((r) => ({
      ...publicPatient(r),
      visitCount: r.visit_count,
      lastVisit: r.last_visit,
      reportCount: r.report_count,
    })),
  });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception", "lab"]);
  if (gate instanceof Response) return gate;
  const { db, staff } = gate;
  const body = await readJson<{ name?: string; phone?: string; area?: string; verified?: boolean }>(context.request);
  if (!body) return bad("Invalid request.");
  if (!body.name?.trim()) return bad("Enter the patient's name.");
  if (!cleanPhone(body.phone ?? "")) return bad("Enter a valid 10-digit mobile number.");
  try {
    const { patient, created } = await findOrCreatePatient(db, {
      name: body.name,
      phone: body.phone!,
      area: body.area,
      verified: body.verified === true,
      source: staff.role === "lab" ? "lab" : "reception",
    });
    await audit(db, staff.id, created ? "patient.create" : "patient.match", `patient:${patient.id}`, patient.code);
    return jsonResponse({ ok: true, created, patient: publicPatient(patient) }, created ? 201 : 200);
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Could not save the patient.");
  }
}
