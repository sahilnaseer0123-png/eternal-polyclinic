// GET  /api/staff/summary?date=YYYY-MM-DD   the owner's daily WhatsApp summary for that date (owner, reception)
// POST /api/staff/summary { date, phone }   send it through the WhatsApp Business API (owner only).
//      Free text: WhatsApp only delivers it if the owner messaged the clinic number in the last 24 hours,
//      so the dashboard's "Share on WhatsApp" button (opens WhatsApp with the text) remains the everyday way.

import { jsonResponse, type CfPagesContext } from "../../_lib/clinic-store";
import { audit, clinicDateKey } from "../../_lib/db";
import { DATE_RE, readJson, staffGate } from "../../_lib/http";
import { ownerSummaryText } from "../../../lib/messages";
import { ownerDayStats } from "../../_lib/stats";
import { sendPlainText } from "../../_lib/whatsapp";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner", "reception"]);
  if (gate instanceof Response) return gate;
  const url = new URL(context.request.url);
  const raw = url.searchParams.get("date") ?? "";
  const date = DATE_RE.test(raw) ? raw : clinicDateKey();
  const stats = await ownerDayStats(gate.db, date);
  return jsonResponse({ ok: true, date, stats, text: ownerSummaryText(stats) });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner"]);
  if (gate instanceof Response) return gate;
  const body = await readJson<{ date?: string; phone?: string }>(context.request);
  const date = body?.date && DATE_RE.test(body.date) ? body.date : clinicDateKey();
  const text = ownerSummaryText(await ownerDayStats(gate.db, date));
  const res = await sendPlainText(context.env, body?.phone ?? "", text);
  await audit(gate.db, gate.staff.id, "summary.send", `summary:${date}`, res.sent ? "sent" : res.error);
  return jsonResponse({ ok: res.sent, error: res.error }, res.sent ? 200 : 502);
}
