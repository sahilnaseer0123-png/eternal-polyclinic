// POST /api/staff/lab-reports/:id/send   manual resend by staff (owner, lab, reception).
// Always a new WhatsApp message with a fresh secure link (older links keep working until they expire).
// Logged separately from the automatic send, so the history shows who resent it and when.

import { jsonResponse, type CfPagesContext } from "../../../../_lib/clinic-store";
import { bad, secretFor } from "../../../../_lib/http";
import { sendReportToPatient } from "../../../../_lib/notify";
import { REPORT_SELECT, reportView } from "../../lab-reports";
import { loadReport } from "../[id]";

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const res = await loadReport(context, ["owner", "lab", "reception"]);
  if (res instanceof Response) return res;
  const { db, staff, row, id } = res;
  if (row.status !== "ready") return bad("Mark the report Ready first; that sends it automatically.");
  const send = await sendReportToPatient(context.env, db, await secretFor(context.env), id, "manual", staff.id);
  const fresh = await db.prepare(`${REPORT_SELECT} WHERE r.id = ?1`).bind(id).first<Record<string, unknown>>();
  return jsonResponse({ ok: send.status === "sent", send, report: reportView(fresh!, true) }, send.status === "sent" ? 200 : 502);
}
