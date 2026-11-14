// Meta WhatsApp Cloud API webhook: /api/whatsapp/webhook
// GET  verification handshake (hub.verify_token must equal WHATSAPP_VERIFY_TOKEN)
// POST delivery updates (sent / delivered / read / failed). Every request must carry a valid
//      X-Hub-Signature-256 made with WHATSAPP_APP_SECRET; anything else is rejected.

import { constantTimeEqual, toHex, withSecurityHeaders, type CfPagesContext } from "../../_lib/clinic-store";
import { applyDeliveryUpdate, type NotificationStatus } from "../../_lib/notify";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const url = new URL(context.request.url);
  const expected = context.env.WHATSAPP_VERIFY_TOKEN;
  if (
    expected &&
    url.searchParams.get("hub.mode") === "subscribe" &&
    constantTimeEqual(url.searchParams.get("hub.verify_token") ?? "", expected)
  ) {
    return withSecurityHeaders(
      new Response(url.searchParams.get("hub.challenge") ?? "", {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      }),
    );
  }
  return withSecurityHeaders(new Response("Forbidden", { status: 403 }));
}

export async function verifyMetaSignature(secret: string, rawBody: ArrayBuffer, header: string | null): Promise<boolean> {
  if (!header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = toHex(new Uint8Array(await crypto.subtle.sign("HMAC", key, rawBody)));
  return constantTimeEqual(sig, header.slice(7));
}

type MetaStatus = { id?: string; status?: string; timestamp?: string; errors?: { code?: number; title?: string; message?: string; error_data?: { details?: string } }[] };
type MetaPayload = { entry?: { changes?: { value?: { statuses?: MetaStatus[] } }[] }[] };

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const secret = context.env.WHATSAPP_APP_SECRET;
  const db = context.env.EP_SQL;
  if (!secret || !db) return withSecurityHeaders(new Response("Not configured", { status: 503 }));

  const raw = await context.request.arrayBuffer();
  if (!(await verifyMetaSignature(secret, raw, context.request.headers.get("X-Hub-Signature-256")))) {
    return withSecurityHeaders(new Response("Bad signature", { status: 401 }));
  }
  let payload: MetaPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw)) as MetaPayload;
  } catch {
    return withSecurityHeaders(new Response("Bad JSON", { status: 400 }));
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const st of change.value?.statuses ?? []) {
        if (!st.id || !st.status) continue;
        const status = (["sent", "delivered", "read", "failed"].includes(st.status) ? st.status : null) as NotificationStatus | null;
        if (!status) continue;
        const err = st.errors?.[0];
        const detail = err ? `${err.code ?? ""} ${err.error_data?.details ?? err.message ?? err.title ?? ""}`.trim() : undefined;
        const at = st.timestamp ? Number(st.timestamp) * 1000 : Date.now();
        await applyDeliveryUpdate(db, st.id, status, detail, Number.isFinite(at) ? at : Date.now());
      }
    }
  }
  // Always 200 for a valid signed request, or Meta retries for days.
  return withSecurityHeaders(new Response("OK", { status: 200 }));
}
