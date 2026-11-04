// GET  /api/staff/notifications   WhatsApp message log (owner, reception; lab sees lab-report messages only)
//      ?kind= appointment_confirmation|lab_report   ?status= queued|sent|delivered|read|failed
//      ?from= &to=   ?q= patient name / mobile / token / report id   ?page=
// POST /api/staff/notifications   { id }  retry one failed message

import { jsonResponse, readClinicState, resolveStorageDriver, type CfPagesContext } from "../../_lib/clinic-store";
import { bad, dateParam, readJson, secretFor, staffGate } from "../../_lib/http";
import { retryNotification } from "../../_lib/notify";
import { whatsappSetupStatus } from "../../_lib/whatsapp";

const PAGE_SIZE = 40;

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
  const kind = staff.role === "lab" ? "lab_report" : url.searchParams.get("kind");
  if (kind && ["appointment_confirmation", "lab_report", "owner_summary"].includes(kind)) where.push(`n.kind = ${bind(kind)}`);
  const status = url.searchParams.get("status");
  if (status && ["queued", "sent", "delivered", "read", "failed"].includes(status)) where.push(`n.status = ${bind(status)}`);
  const from = dateParam(url, "from");
  const to = dateParam(url, "to");
  if (from) where.push(`n.created_date >= ${bind(from)}`);
  if (to) where.push(`n.created_date <= ${bind(to)}`);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    where.push(`(p.name LIKE ${bind(like)} OR n.to_phone LIKE ${bind(like)} OR n.ref_id LIKE ${bind(like)} OR p.code LIKE ${bind(like)})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);

  const total =
    (await db.prepare(`SELECT COUNT(*) AS n FROM notifications n LEFT JOIN patients p ON p.id = n.patient_id ${whereSql}`).bind(...binds).first<{ n: number }>())?.n ?? 0;
  const { results } = await db
    .prepare(
      `SELECT n.*, p.name AS patient_name, p.code AS patient_code, s.display_name AS created_by_name
       FROM notifications n LEFT JOIN patients p ON p.id = n.patient_id LEFT JOIN staff s ON s.id = n.created_by
       ${whereSql} ORDER BY n.id DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    )
    .bind(...binds)
    .all<Record<string, unknown>>();
  const failed = await db
    .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE status = 'failed'${staff.role === "lab" ? " AND kind = 'lab_report'" : ""}`)
    .first<{ n: number }>();

  return jsonResponse({
    ok: true,
    total,
    page,
    pageSize: PAGE_SIZE,
    failedCount: failed?.n ?? 0,
    whatsapp: whatsappSetupStatus(context.env),
    notifications: results.map((n) => ({
      id: n.id,
      kind: n.kind,
      refId: n.ref_id,
      patientId: n.patient_id,
      patientName: n.patient_name,
      patientCode: n.patient_code,
      toPhone: n.to_phone,
      channel: n.channel,
      status: n.status,
      attempt: n.attempt,
      trigger: n.trigger,
      error: n.error,
      createdBy: n.created_by_name,
      createdAt: n.created_at,
      sentAt: n.sent_at,
      deliveredAt: n.delivered_at,
      readAt: n.read_at,
      failedAt: n.failed_at,
    })),
  });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception", "lab"]);
  if (gate instanceof Response) return gate;
  const { db, staff } = gate;
  const body = await readJson<{ id?: number }>(context.request);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return bad("Choose a message to retry.");
  if (staff.role === "lab") {
    const n = await db.prepare("SELECT kind FROM notifications WHERE id = ?1").bind(id).first<{ kind: string }>();
    if (n?.kind !== "lab_report") return bad("Lab accounts can retry lab report messages only.", 403);
  }
  const driver = resolveStorageDriver(context.env);
  const result = await retryNotification(context.env, db, await secretFor(context.env), id, staff.id, async (token) => {
    if (!driver) return null;
    const state = await readClinicState(driver);
    return state.appointments.find((a) => a.token === token) ?? null;
  });
  return jsonResponse({ ok: result.ok, status: result.status, error: result.error }, result.ok ? 200 : result.status ? 502 : 400);
}
