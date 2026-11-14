// Staff sign-in: GET & POST /api/admin/auth
//
// GET  → who is signed in, whether staff accounts exist yet, storage and WhatsApp setup status.
// POST → { action: "login", username, password }        staff sign-in (normal)
//        { action: "login", pin }                       old shared PIN, ONLY while no staff account exists
//        { action: "setup_owner", pin, username, displayName, password }
//                                                       creates the first owner account (needs the current PIN)
//        { action: "logout" }
//        { action: "change_password", currentPassword, newPassword }
//        { action: "change_pin", newPin }               old PIN mode only

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
import { audit } from "../../_lib/db";
import { checkRateLimit, checkSameOrigin, clientIp, rateLimitResponse } from "../../_lib/rate-limit";
import {
  clearStaffCookie,
  createStaff,
  loginStaff,
  setStaffPassword,
  staffCount,
  staffFromRequest,
  validatePassword,
  validateUsername,
} from "../../_lib/staff-auth";
import { getConfiguredWhatsAppChannel, whatsappSetupStatus } from "../../_lib/whatsapp";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const { env, request } = context;
  const driver = resolveStorageDriver(env);
  const whatsappChannel = getConfiguredWhatsAppChannel(env);
  const database = Boolean(env.EP_SQL);
  if (!driver) {
    return jsonResponse({
      configured: false,
      authenticated: false,
      storageDriver: "none",
      usingDefaultPin: false,
      whatsappChannel,
      database,
      staffMode: "unavailable",
      staff: null,
    });
  }

  const staff = await staffFromRequest(request, env);
  const accounts = env.EP_SQL ? await staffCount(env.EP_SQL) : 0;
  const staffMode = !env.EP_SQL ? "pin_only" : accounts === 0 ? "setup" : "accounts";
  const legacy = !staff && staffMode !== "accounts" && (await verifyRequestSession(request, driver, env));
  const authenticated = Boolean(staff) || legacy;

  return jsonResponse({
    configured: true,
    authenticated,
    storageDriver: driver.kind,
    usingDefaultPin: legacy ? await isUsingDefaultPin(driver, env) : false,
    whatsappChannel,
    whatsapp: authenticated ? whatsappSetupStatus(env) : undefined,
    database,
    staffMode,
    staff: staff ? { id: staff.id, username: staff.username, displayName: staff.displayName, role: staff.role } : null,
  });
}

type AuthPostBody = {
  action?: string;
  pin?: string;
  newPin?: string;
  username?: string;
  password?: string;
  displayName?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const { env, request } = context;
  const originErr = checkSameOrigin(request);
  if (originErr) return originErr;

  const driver = resolveStorageDriver(env);
  if (!driver) {
    return jsonResponse(
      { ok: false, configured: false, error: "Cloud storage binding (EP_DB or EP_KV) is not configured yet." },
      503,
    );
  }

  const isHttps = new URL(request.url).protocol === "https:";
  let body: AuthPostBody;
  try {
    body = (await request.json()) as AuthPostBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
  }

  const db = env.EP_SQL;
  const accounts = db ? await staffCount(db) : 0;

  if (body.action === "logout") {
    const staff = await staffFromRequest(request, env);
    const legacy = !staff && (await verifyRequestSession(request, driver, env));
    if (!staff && !legacy) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }
    const res = jsonResponse({ ok: true });
    res.headers.append("Set-Cookie", clearSessionCookie(isHttps));
    res.headers.append("Set-Cookie", clearStaffCookie(isHttps));
    return res;
  }

  if (body.action === "login") {
    const rl = checkRateLimit("auth_login", clientIp(request), 8, 15 * 60 * 1000);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

    // Staff account sign-in
    if (typeof body.username === "string" && body.username.trim()) {
      if (!db) return jsonResponse({ ok: false, error: "Staff accounts need the clinic database (EP_SQL)." }, 503);
      const result = await loginStaff(db, env, body.username, typeof body.password === "string" ? body.password : "", isHttps);
      if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 401);
      return jsonResponse(
        { ok: true, configured: true, storageDriver: driver.kind, staff: result.staff, usingDefaultPin: false },
        200,
        { "Set-Cookie": result.cookie },
      );
    }
    // Old shared PIN: only until the first staff account exists
    if (accounts > 0) {
      return jsonResponse({ ok: false, error: "The shared PIN is switched off. Sign in with your username and password." }, 401);
    }
    const pin = typeof body.pin === "string" ? body.pin : "";
    const valid = await verifyAdminPin(pin, driver, env);
    if (!valid) {
      return jsonResponse({ ok: false, error: "Incorrect PIN. Please try again." }, 401);
    }
    const cookie = await createSessionCookie(driver, env, isHttps);
    const usingDefaultPin = await isUsingDefaultPin(driver, env);
    return jsonResponse(
      { ok: true, configured: true, storageDriver: driver.kind, usingDefaultPin, staffMode: db ? "setup" : "pin_only" },
      200,
      { "Set-Cookie": cookie },
    );
  }

  if (body.action === "setup_owner") {
    const rl = checkRateLimit("auth_login", clientIp(request), 8, 15 * 60 * 1000);
    if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

    if (!db) return jsonResponse({ ok: false, error: "Staff accounts need the clinic database (EP_SQL)." }, 503);
    if (accounts > 0) return jsonResponse({ ok: false, error: "The owner account already exists. Sign in instead." }, 409);
    const pinOk = await verifyAdminPin(typeof body.pin === "string" ? body.pin : "", driver, env);
    if (!pinOk) return jsonResponse({ ok: false, error: "Enter the current dashboard PIN to prove you're the owner." }, 401);
    const username = (body.username ?? "").trim().toLowerCase();
    const displayName = (body.displayName ?? "").trim();
    const password = body.password ?? "";
    const problem = validateUsername(username) ?? (displayName ? null : "Enter your name.") ?? validatePassword(password);
    if (problem) return jsonResponse({ ok: false, error: problem }, 400);
    await createStaff(db, { username, displayName, role: "owner", password }, null);
    const result = await loginStaff(db, env, username, password, isHttps);
    if (!result.ok) return jsonResponse({ ok: false, error: result.error }, 500);
    await audit(db, result.staff.id, "staff.setup_owner", `staff:${result.staff.id}`, "Shared PIN switched off");
    const res = jsonResponse({ ok: true, staff: result.staff });
    res.headers.append("Set-Cookie", result.cookie);
    res.headers.append("Set-Cookie", clearSessionCookie(isHttps));
    return res;
  }

  if (body.action === "change_password") {
    const staff = await staffFromRequest(request, env);
    if (!staff || !db) return jsonResponse({ ok: false, error: "Please sign in." }, 401);
    const check = await loginStaff(db, env, staff.username, body.currentPassword ?? "", isHttps);
    if (!check.ok) return jsonResponse({ ok: false, error: "Current password is wrong." }, 401);
    const problem = validatePassword(body.newPassword ?? "");
    if (problem) return jsonResponse({ ok: false, error: problem }, 400);
    await setStaffPassword(db, staff.id, body.newPassword!);
    await audit(db, staff.id, "staff.change_password", `staff:${staff.id}`);
    // Password change signs out every device; sign this one back in.
    const fresh = await loginStaff(db, env, staff.username, body.newPassword!, isHttps);
    return jsonResponse({ ok: true }, 200, fresh.ok ? { "Set-Cookie": fresh.cookie } : undefined);
  }

  if (body.action === "change_pin") {
    if (accounts > 0) return jsonResponse({ ok: false, error: "The shared PIN is switched off now that staff accounts exist." }, 400);
    const authenticated = await verifyRequestSession(request, driver, env);
    if (!authenticated) {
      return jsonResponse({ ok: false, error: "Unauthorized session." }, 401);
    }
    const newPin = typeof body.newPin === "string" ? body.newPin.trim() : "";
    if (newPin.length < 4 || newPin.length > 64) {
      return jsonResponse({ ok: false, error: "PIN must be between 4 and 64 characters." }, 400);
    }
    await saveAdminPin(newPin, driver);
    const freshCookie = await createSessionCookie(driver, env, isHttps);
    return jsonResponse({ ok: true, usingDefaultPin: false }, 200, { "Set-Cookie": freshCookie });
  }

  return jsonResponse({ ok: false, error: "Unsupported auth action." }, 400);
}
