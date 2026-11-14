// GET /api/report/media?id=&exp=&sig=   PDF fetched by the WhatsApp provider (Twilio / gateway) while sending.
// HMAC-signed with the clinic secret and valid for 15 minutes; only for reports marked Ready.
// Meta Cloud API doesn't use this: there the PDF is uploaded directly through Meta's Media API.

import {
  constantTimeEqual,
  hmacSha256Hex,
  peekSigningSecret,
  resolveStorageDriver,
  withSecurityHeaders,
  type CfPagesContext,
} from "../../_lib/clinic-store";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id") ?? "";
  const exp = Number(url.searchParams.get("exp"));
  const sig = url.searchParams.get("sig") ?? "";
  const notFound = () =>
    withSecurityHeaders(
      new Response("Not found", { status: 404, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } }),
    );

  const db = context.env.EP_SQL;
  const kv = context.env.EP_KV;
  const driver = resolveStorageDriver(context.env);
  if (!db || !kv || !driver || !id || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return notFound();
  const secret = await peekSigningSecret(driver, context.env);
  if (!secret) return notFound();
  const expected = await hmacSha256Hex(secret, `media:${id}:${exp}`);
  if (!constantTimeEqual(sig, expected)) return notFound();

  const report = await db
    .prepare("SELECT file_key, file_name, status FROM lab_reports WHERE id = ?1")
    .bind(id)
    .first<{ file_key: string | null; file_name: string | null; status: string }>();
  if (!report?.file_key || report.status !== "ready") return notFound();
  const data = await kv.get(report.file_key, "arrayBuffer");
  if (!data) return notFound();
  return withSecurityHeaders(
    new Response(data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${(report.file_name ?? "Lab-report.pdf").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    }),
  );
}
