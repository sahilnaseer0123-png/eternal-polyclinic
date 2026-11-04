// GET   /api/staff/lab-reports/:id   report + full message history (owner, reception, lab)
// PATCH /api/staff/lab-reports/:id   (owner, lab)
//       { status: "ready" }        release it: needs a PDF; sends it to the patient automatically, once
//       { status: "processing" }   take it back (e.g. wrong file) before re-uploading
//       { testName?, sampleDate?, notes? }

import { jsonResponse, type CfPagesContext } from "../../../_lib/clinic-store";
import { audit, changes, clinicDateKey } from "../../../_lib/db";
import { DATE_RE, bad, param, readJson, secretFor, staffGate } from "../../../_lib/http";
import { sendReportToPatient } from "../../../_lib/notify";
import { REPORT_SELECT, reportView } from "../lab-reports";

export async function loadReport(context: CfPagesContext, roles: ("owner" | "reception" | "lab")[]) {
  const gate = await staffGate(context, roles);
  if (gate instanceof Response) return gate;
  const id = param(context, "id");
  const row = await gate.db.prepare(`${REPORT_SELECT} WHERE r.id = ?1`).bind(id).first<Record<string, unknown>>();
  if (!row) return bad("Report not found.", 404);
  return { ...gate, row, id };
}

async function history(context: CfPagesContext, db: import("../../../_lib/db").SqlDatabase, id: string) {
  const { results: messages } = await db
    .prepare(
      `SELECT id, status, attempt, trigger, channel, error, provider_message_id, created_at, sent_at, delivered_at, read_at, failed_at, created_by
       FROM notifications WHERE kind = 'lab_report' AND ref_id = ?1 ORDER BY id DESC`,
    )
    .bind(id)
    .all<{ id: number }>();
  const { results: events } = await db
    .prepare(
      `SELECT e.notification_id, e.status, e.detail, e.at FROM notification_events e
       JOIN notifications n ON n.id = e.notification_id WHERE n.kind = 'lab_report' AND n.ref_id = ?1 ORDER BY e.id DESC LIMIT 100`,
    )
    .bind(id)
    .all();
  const { results: activity } = await db
    .prepare(
      `SELECT a.action, a.detail, a.at, s.display_name AS by FROM audit_log a LEFT JOIN staff s ON s.id = a.staff_id
       WHERE a.target = ?1 ORDER BY a.id DESC LIMIT 50`,
    )
    .bind(`report:${id}`)
    .all();
  return { messages, events, activity };
}

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const res = await loadReport(context, ["owner", "reception", "lab"]);
  if (res instanceof Response) return res;
  return jsonResponse({ ok: true, report: reportView(res.row, true), ...(await history(context, res.db, res.id)) });
}

export async function onRequestPatch(context: CfPagesContext): Promise<Response> {
  const res = await loadReport(context, ["owner", "lab"]);
  if (res instanceof Response) return res;
  const { db, staff, row, id } = res;
  const body = await readJson<{ status?: string; testName?: string; sampleDate?: string; notes?: string }>(context.request);
  if (!body) return bad("Invalid request.");
  const now = Date.now();

  if (body.testName !== undefined || body.sampleDate !== undefined || body.notes !== undefined) {
    const testName = body.testName !== undefined ? body.testName.trim().replace(/\s+/g, " ") : String(row.test_name);
    if (testName.length < 2 || testName.length > 120) return bad("Enter the test name.");
    const sampleDate = body.sampleDate !== undefined ? body.sampleDate : String(row.sample_date);
    if (!DATE_RE.test(sampleDate) || sampleDate > clinicDateKey()) return bad("Check the sample date.");
    await db
      .prepare("UPDATE lab_reports SET test_name = ?1, sample_date = ?2, notes = ?3, updated_at = ?4 WHERE id = ?5")
      .bind(testName, sampleDate, body.notes !== undefined ? body.notes.trim() || null : row.notes ?? null, now, id)
      .run();
    await audit(db, staff.id, "lab.edit", `report:${id}`);
  }

  let send: Awaited<ReturnType<typeof sendReportToPatient>> | null = null;
  if (body.status === "ready") {
    if (!row.file_key) return bad("Upload the PDF before marking the report Ready.");
    const upd = await db
      .prepare("UPDATE lab_reports SET status = 'ready', ready_at = ?1, ready_by = ?2, updated_at = ?1 WHERE id = ?3 AND status != 'ready' AND file_key IS NOT NULL")
      .bind(now, staff.id, id)
      .run();
    if (changes(upd) > 0) await audit(db, staff.id, "lab.ready", `report:${id}`);
    // Sent automatically, exactly once per report (second clicks and races are ignored).
    send = await sendReportToPatient(context.env, db, await secretFor(context.env), id, "auto", staff.id);
  } else if (body.status === "processing") {
    if (row.delivery_status !== "not_sent" && row.delivery_status !== "failed") {
      return bad("This report was already sent to the patient. Upload a corrected PDF and use Resend instead.");
    }
    await db.prepare("UPDATE lab_reports SET status = 'processing', ready_at = NULL, auto_sent_at = NULL, updated_at = ?1 WHERE id = ?2 AND file_key IS NOT NULL").bind(now, id).run();
    await audit(db, staff.id, "lab.unready", `report:${id}`);
  } else if (body.status !== undefined && body.status !== "ready") {
    return bad("Unknown status.");
  }

  const fresh = await db.prepare(`${REPORT_SELECT} WHERE r.id = ?1`).bind(id).first<Record<string, unknown>>();
  return jsonResponse({ ok: true, report: reportView(fresh!, true), send });
}
