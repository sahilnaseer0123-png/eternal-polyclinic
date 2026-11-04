// Protected OPD register endpoint: GET & POST /api/admin/state
// Staff roles: owner and reception (lab accounts can't see the register).
// The old shared-PIN session still works only until the first staff account is created.
//
// Every appointment saved here is also linked to its patient record in the clinic database (EP_SQL)
// and its WhatsApp confirmation is sent once (afterAppointmentSaved). Status changes and deletions are
// mirrored so patient history and statistics stay true; deleted appointments are kept, marked deleted.

import {
  applyCloudMutation,
  jsonResponse,
  readClinicState,
  resolveStorageDriver,
  type CfPagesContext,
  type CloudMutation,
} from "../../_lib/clinic-store";
import { afterAppointmentSaved } from "../../_lib/notify";
import { backfillFromRegister, markAppointmentRecordDeleted, setAppointmentRecordStatus } from "../../_lib/patients";
import { authorize } from "../../_lib/staff-auth";

function statePayload(state: Awaited<ReturnType<typeof readClinicState>>) {
  return {
    updatedAt: state.updatedAt,
    appointments: state.appointments,
    doctorStatuses: state.doctorStatuses,
    overrides: state.overrides,
    customDoctors: state.customDoctors,
  };
}

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false }, 503);
  }

  const access = await authorize(context, ["owner", "reception"], { allowLegacyPin: true });
  if (!access.ok) {
    return jsonResponse({ ok: false, error: access.status === 401 ? "Unauthorized" : access.error }, access.status);
  }

  const state = await readClinicState(driver);
  // First time the database is connected: copy the existing register into it (runs once).
  if (context.env.EP_SQL) {
    try {
      await backfillFromRegister(context.env.EP_SQL, state.appointments);
    } catch (err) {
      console.error("Backfill failed", err);
    }
  }
  return jsonResponse({ ok: true, configured: true, storageDriver: driver.kind, state: statePayload(state) });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false }, 503);
  }

  const access = await authorize(context, ["owner", "reception"], { allowLegacyPin: true });
  if (!access.ok) {
    return jsonResponse({ ok: false, error: access.status === 401 ? "Unauthorized" : access.error }, access.status);
  }
  const staffId = access.staff?.id ?? null;

  let mutation: CloudMutation;
  try {
    mutation = (await context.request.json()) as CloudMutation;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (!mutation || typeof mutation.op !== "string") {
    return jsonResponse({ ok: false, error: "Missing mutation op" }, 400);
  }

  let notification: Awaited<ReturnType<typeof afterAppointmentSaved>> | null = null;
  if (mutation.op === "upsert_appointment" && mutation.appointment?.token) {
    try {
      notification = await afterAppointmentSaved(context.env, mutation.appointment, staffId);
      if (notification.sent && !mutation.appointment.whatsappSent) {
        mutation = { op: "upsert_appointment", appointment: { ...mutation.appointment, whatsappSent: true } };
      }
    } catch (err) {
      // Never lose the appointment because the record or message failed: it is still saved below.
      notification = { sent: false, channel: "error", error: err instanceof Error ? err.message : "Notification error" };
    }
  }

  const nextState = await applyCloudMutation(driver, mutation);

  const db = context.env.EP_SQL;
  if (db) {
    try {
      if (mutation.op === "update_appointment_status") {
        await setAppointmentRecordStatus(db, mutation.token, mutation.status);
      } else if (mutation.op === "delete_appointment") {
        await markAppointmentRecordDeleted(db, mutation.token);
      } else if (mutation.op === "sync_merge" && Array.isArray(mutation.appointments)) {
        // Appointments made on a tablet while offline: link them and confirm the new ones (once each).
        const saved = new Set(nextState.appointments.map((a) => a.token));
        for (const apt of mutation.appointments) {
          if (apt?.token && saved.has(apt.token)) await afterAppointmentSaved(context.env, apt, staffId);
        }
      }
    } catch (err) {
      console.error("Patient record sync failed", err);
    }
  }

  return jsonResponse({ ok: true, storageDriver: driver.kind, notification, state: statePayload(nextState) });
}
