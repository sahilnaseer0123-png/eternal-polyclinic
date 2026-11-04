// POST /api/report/view   { token, last4 }   the patient's own report, from the link sent on WhatsApp.
//
// Protection: the link token (24 random bytes, only its hash is stored) + the last 4 digits of the
// registered mobile + expiry (30 days by default) + 8 wrong tries locks that link. Only the report
// the link was made for can be opened; nothing about other patients is reachable.
// Returns the PDF itself (never a public file URL); basic details travel in the X-Report header.

import { jsonResponse, type CfPagesContext } from "../../_lib/clinic-store";
import { ensureSchema } from "../../_lib/db";
import { readJson } from "../../_lib/http";
import { reportLinkHash } from "../../_lib/notify";

const MAX_FAILED = 8;

type LinkRow = {
  token_hash: string;
  report_id: string;
  expires_at: number;
  revoked: number;
  failed_attempts: number;
  status: string;
  file_key: string | null;
  file_name: string | null;
  test_name: string;
  sample_date: string;
  phone: string;
  name: string;
};

function deny(message: string, status: number) {
  return jsonResponse({ ok: false, error: message }, status, { "X-Robots-Tag": "noindex" });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const db = context.env.EP_SQL;
  const kv = context.env.EP_KV;
  if (!db || !kv) return deny("Reports can't be opened online right now. Please call the clinic.", 503);
  await ensureSchema(db);

  const body = await readJson<{ token?: string; last4?: string }>(context.request);
  const token = (body?.token ?? "").trim();
  const last4 = (body?.last4 ?? "").replace(/\D/g, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return deny("This report link is not valid. Use the link from your WhatsApp message.", 400);
  if (!/^\d{4}$/.test(last4)) return deny("Enter the last 4 digits of your mobile number.", 400);

  const hash = await reportLinkHash(token);
  const link = await db
    .prepare(
      `SELECT l.*, r.status, r.file_key, r.file_name, r.test_name, r.sample_date, p.phone, p.name
       FROM report_links l JOIN lab_reports r ON r.id = l.report_id JOIN patients p ON p.id = r.patient_id
       WHERE l.token_hash = ?1`,
    )
    .bind(hash)
    .first<LinkRow>();
  const generic = "This report link is not valid. Use the link from your WhatsApp message, or ask the clinic to resend it.";
  if (!link) return deny(generic, 404);
  if (link.revoked || link.failed_attempts >= MAX_FAILED) {
    return deny("This link has been locked after too many wrong tries. Ask the clinic to resend your report.", 423);
  }
  if (link.expires_at < Date.now()) return deny("This link has expired. Ask the clinic to resend your report on WhatsApp.", 410);
  if (link.status !== "ready" || !link.file_key) return deny("This report is being updated. Please try again later.", 409);

  if (link.phone.slice(-4) !== last4) {
    await db.prepare("UPDATE report_links SET failed_attempts = failed_attempts + 1 WHERE token_hash = ?1").bind(hash).run();
    const left = MAX_FAILED - link.failed_attempts - 1;
    return deny(
      left > 0
        ? `Those digits don't match the mobile number registered for this report. ${left} ${left === 1 ? "try" : "tries"} left.`
        : "This link has been locked after too many wrong tries. Ask the clinic to resend your report.",
      403,
    );
  }

  const data = await kv.get(link.file_key, "arrayBuffer");
  if (!data) return deny("The report file is missing. Please call the clinic.", 404);
  await db
    .prepare("UPDATE report_links SET failed_attempts = 0, open_count = open_count + 1, last_opened_at = ?1 WHERE token_hash = ?2")
    .bind(Date.now(), hash)
    .run();

  const meta = {
    firstName: link.name.split(" ")[0],
    testName: link.test_name,
    sampleDate: link.sample_date,
    fileName: link.file_name ?? "Lab-report.pdf",
    expiresAt: link.expires_at,
  };
  return new Response(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${meta.fileName.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
      "X-Report": encodeURIComponent(JSON.stringify(meta)),
    },
  });
}
