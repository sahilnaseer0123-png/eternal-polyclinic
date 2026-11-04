// Public read-only endpoint: GET /api/live
// Returns live specialist delay/arrival status, leave overrides, custom specialists, and anonymized booked slot times.
// Contains ZERO patient PII (no names, phone numbers, villages, or token numbers).

import {
  buildPublicLivePayload,
  jsonResponse,
  readClinicState,
  resolveStorageDriver,
  type CfPagesContext,
} from "../_lib/clinic-store";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({
      configured: false,
      updatedAt: 0,
      doctorStatuses: {},
      overrides: {},
      customDoctors: [],
      bookedSlots: [],
    });
  }

  const state = await readClinicState(driver);
  return jsonResponse(buildPublicLivePayload(state));
}

