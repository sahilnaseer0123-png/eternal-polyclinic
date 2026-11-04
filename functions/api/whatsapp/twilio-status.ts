// Twilio delivery updates: POST /api/whatsapp/twilio-status
// Set this URL as the "Status callback URL" of the Twilio WhatsApp sender.
// Every request must carry a valid X-Twilio-Signature (HMAC-SHA1 with TWILIO_AUTH_TOKEN).

import { constantTimeEqual, type CfPagesContext } from "../../_lib/clinic-store";
import { applyDeliveryUpdate, type NotificationStatus } from "../../_lib/notify";

export async function twilioSignature(authToken: string, url: string, params: URLSearchParams): Promise<string> {
  const sorted = [...params.keys()].sort();
  let data = url;
  for (const k of sorted) data += k + (params.get(k) ?? "");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(authToken), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  let s = "";
  for (const b of sig) s += String.fromCharCode(b);
  return btoa(s);
}

const MAP: Record<string, NotificationStatus> = {
  sent: "sent",
  delivered: "delivered",
  read: "read",
  failed: "failed",
  undelivered: "failed",
};

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const token = context.env.TWILIO_AUTH_TOKEN;
  const db = context.env.EP_SQL;
  if (!token || !db) return new Response("Not configured", { status: 503 });
  const params = new URLSearchParams(await context.request.text());
  const expected = await twilioSignature(token, context.request.url, params);
  if (!constantTimeEqual(context.request.headers.get("X-Twilio-Signature") ?? "", expected)) {
    return new Response("Bad signature", { status: 401 });
  }
  const sid = params.get("MessageSid");
  const status = MAP[params.get("MessageStatus") ?? ""];
  if (sid && status) {
    const detail = params.get("ErrorCode") ? `Twilio error ${params.get("ErrorCode")}` : undefined;
    await applyDeliveryUpdate(db, sid, status, detail);
  }
  return new Response("OK", { status: 200 });
}
