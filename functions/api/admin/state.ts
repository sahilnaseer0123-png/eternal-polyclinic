// Protected clinic register endpoint: GET & POST /api/admin/state
// Requires a valid signed HttpOnly session cookie issued by /api/admin/auth.

import {
  applyCloudMutation,
  jsonResponse,
  readClinicState,
  resolveStorageDriver,
  verifyRequestSession,
  type CfPagesContext,
  type CloudMutation,
} from "../../_lib/clinic-store";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false }, 503);
  }

  const authenticated = await verifyRequestSession(context.request, driver, context.env);
  if (!authenticated) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  const state = await readClinicState(driver);
  return jsonResponse({
    ok: true,
    configured: true,
    storageDriver: driver.kind,
    state: {
      updatedAt: state.updatedAt,
      appointments: state.appointments,
      doctorStatuses: state.doctorStatuses,
      overrides: state.overrides,
      customDoctors: state.customDoctors,
    },
  });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false }, 503);
  }

  const authenticated = await verifyRequestSession(context.request, driver, context.env);
  if (!authenticated) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
  }

  let mutation: CloudMutation;
  try {
    mutation = (await context.request.json()) as CloudMutation;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (!mutation || typeof mutation.op !== "string") {
    return jsonResponse({ ok: false, error: "Missing mutation op" }, 400);
  }

  const nextState = await applyCloudMutation(driver, mutation);
  return jsonResponse({
    ok: true,
    storageDriver: driver.kind,
    state: {
      updatedAt: nextState.updatedAt,
      appointments: nextState.appointments,
      doctorStatuses: nextState.doctorStatuses,
      overrides: nextState.overrides,
      customDoctors: nextState.customDoctors,
    },
  });
}

