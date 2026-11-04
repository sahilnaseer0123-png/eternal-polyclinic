// Staff authentication endpoint: GET & POST /api/admin/auth
// Verifies the admin PIN on the server and issues a signed HttpOnly session cookie.

import {
  clearSessionCookie,
  createSessionCookie,
  isUsingDefaultPin,
  jsonResponse,
  resolveStorageDriver,
  saveAdminPin,
  verifyAdminPin,
  verifyRequestSession,
  type CfPagesContext,
} from "../../_lib/clinic-store";
import { getConfiguredWhatsAppChannel } from "../../_lib/whatsapp";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  const whatsappChannel = getConfiguredWhatsAppChannel(context.env);
  if (!driver) {
    return jsonResponse({
      configured: false,
      authenticated: false,
      storageDriver: "none",
      usingDefaultPin: false,
      whatsappChannel,
    });
  }

  const authenticated = await verifyRequestSession(context.request, driver, context.env);
  const usingDefaultPin = authenticated ? await isUsingDefaultPin(driver, context.env) : false;

  return jsonResponse({
    configured: true,
    authenticated,
    storageDriver: driver.kind,
    usingDefaultPin,
    whatsappChannel,
  });
}

type AuthPostBody =
  | { action: "login"; pin?: string }
  | { action: "logout" }
  | { action: "change_pin"; newPin?: string };

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse(
      { ok: false, configured: false, error: "Cloud storage binding (EP_DB or EP_KV) is not configured yet." },
      503,
    );
  }

  const isHttps = new URL(context.request.url).protocol === "https:";
  let body: AuthPostBody;
  try {
    body = (await context.request.json()) as AuthPostBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  if (body.action === "logout") {
    return jsonResponse(
      { ok: true },
      200,
      { "Set-Cookie": clearSessionCookie(isHttps) },
    );
  }

  if (body.action === "login") {
    const pin = typeof body.pin === "string" ? body.pin : "";
    const valid = await verifyAdminPin(pin, driver, context.env);
    if (!valid) {
      return jsonResponse({ ok: false, error: "Incorrect PIN. Please try again." }, 401);
    }
    const cookie = await createSessionCookie(driver, context.env, isHttps);
    const usingDefaultPin = await isUsingDefaultPin(driver, context.env);
    return jsonResponse(
      { ok: true, configured: true, storageDriver: driver.kind, usingDefaultPin },
      200,
      { "Set-Cookie": cookie },
    );
  }

  if (body.action === "change_pin") {
    const authenticated = await verifyRequestSession(context.request, driver, context.env);
    if (!authenticated) {
      return jsonResponse({ ok: false, error: "Unauthorized session." }, 401);
    }
    const newPin = typeof body.newPin === "string" ? body.newPin.trim() : "";
    if (newPin.length < 4 || newPin.length > 64) {
      return jsonResponse({ ok: false, error: "PIN must be between 4 and 64 characters." }, 400);
    }
    await saveAdminPin(newPin, driver);
    const freshCookie = await createSessionCookie(driver, context.env, isHttps);
    return jsonResponse(
      { ok: true, usingDefaultPin: false },
      200,
      { "Set-Cookie": freshCookie },
    );
  }

  return jsonResponse({ ok: false, error: "Unsupported auth action." }, 400);
}

