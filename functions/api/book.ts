// Public On-Website Booking, Token Lookup & Cancellation API: /api/book
// - POST /api/book: Validates schedule & live slot availability, issues official EP-... token,
//   locks the slot, syncs directly into /admin, and dispatches instant WhatsApp confirmation to the patient.
// - GET /api/book?phone=9876543210[&token=EP-...]: Looks up active appointments for that 10-digit mobile number.
// - DELETE /api/book: Cancels an appointment when both token and 10-digit mobile number match, freeing the slot.

import { generateToken, isDoctorOnLeave, type Appointment } from "../../lib/appointments";
import { normalizePhone, validateBooking } from "../../lib/booking";
import {
  applyCloudMutation,
  buildActiveDoctorsFromState,
  clinicTodayKey,
  jsonResponse,
  readClinicState,
  resolveStorageDriver,
  type CfPagesContext,
} from "../_lib/clinic-store";
import { afterAppointmentSaved } from "../_lib/notify";
import { setAppointmentRecordStatus } from "../_lib/patients";
import { checkRateLimit, checkSameOrigin, clientIp, rateLimitResponse } from "../_lib/rate-limit";

type PublicBookingBody = {
  doctorId?: string;
  date?: string;
  time?: string;
  name?: string;
  phone?: string;
  address?: string;
  website?: string; // Honeypot field — real humans leave this blank
};

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const originErr = checkSameOrigin(context.request);
  if (originErr) return originErr;
  const rl = checkRateLimit("book_post", clientIp(context.request), 12, 10 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse(
      { ok: false, configured: false, error: "Online booking database is temporarily unavailable. Please call reception." },
      503,
    );
  }

  let body: PublicBookingBody;
  try {
    body = (await context.request.json()) as PublicBookingBody;
  } catch {
    return jsonResponse({ ok: false, error: "Invalid booking request." }, 400);
  }

  // Reject automated bot submissions that fill the hidden honeypot field
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return jsonResponse({ ok: false, error: "Unable to process booking." }, 400);
  }

  const now = new Date();
  const todayKey = clinicTodayKey(now);
  const state = await readClinicState(driver, now);
  const activeDoctors = buildActiveDoctorsFromState(state, now);

  const validation = validateBooking(
    {
      doctorId: typeof body.doctorId === "string" ? body.doctorId : "",
      date: typeof body.date === "string" ? body.date : "",
      time: typeof body.time === "string" ? body.time : "",
      name: typeof body.name === "string" ? body.name : "",
      phone: typeof body.phone === "string" ? body.phone : "",
      address: typeof body.address === "string" ? body.address : "",
    },
    activeDoctors,
    now,
  );

  if (!validation.ok) {
    return jsonResponse({ ok: false, errors: validation.errors }, 422);
  }

  const req = validation.data;
  const doctor = activeDoctors.find((d) => d.id === req.doctorId)!;

  if (isDoctorOnLeave(doctor)) {
    return jsonResponse(
      { ok: false, errors: { doctorId: `${doctor.name ?? doctor.speciality} is currently ${doctor.availability}.` } },
      422,
    );
  }

  if (req.date === todayKey && state.doctorStatuses[doctor.id]?.state === "cancelled") {
    return jsonResponse(
      { ok: false, errors: { date: `Today's OPD for ${doctor.name ?? doctor.speciality} has been cancelled. Please pick the next sitting.` } },
      422,
    );
  }

  // 1. Check if this exact phone already holds an active booking with this doctor on this date (idempotent & anti-hoarding)
  const existingSameDoc = state.appointments.find(
    (a) =>
      a.patientPhone === req.phone &&
      a.doctorId === doctor.id &&
      a.date === req.date &&
      a.status !== "cancelled",
  );

  if (existingSameDoc) {
    if (existingSameDoc.time === req.time) {
      return jsonResponse({
        ok: true,
        alreadyBooked: true,
        appointment: existingSameDoc,
        whatsapp: { sent: Boolean(existingSameDoc.whatsappSent), channel: "cached" },
      });
    }
    return jsonResponse(
      {
        ok: false,
        errors: {
          time: `This mobile number already has Token ${existingSameDoc.token} at ${existingSameDoc.time} with ${doctor.name ?? doctor.speciality} on this day. Use "Find My Token" to cancel it first if you wish to change times.`,
        },
      },
      409,
    );
  }

  // 2. Cap total active bookings per phone number on any single date to 3 (allows family members across doctors, prevents slot wiping)
  const sameDayCountForPhone = state.appointments.filter(
    (a) => a.patientPhone === req.phone && a.date === req.date && a.status !== "cancelled",
  ).length;
  if (sameDayCountForPhone >= 3) {
    return jsonResponse(
      {
        ok: false,
        errors: {
          phone: "Maximum of 3 appointments per day reached for this mobile number. Please call reception for group bookings.",
        },
      },
      429,
    );
  }

  // 3. Check live slot lock (prevent double-booking)
  const slotTaken = state.appointments.some(
    (a) => a.doctorId === doctor.id && a.date === req.date && a.time === req.time && a.status !== "cancelled",
  );
  if (slotTaken) {
    return jsonResponse(
      {
        ok: false,
        errors: {
          time: "Sorry, that time slot was just booked by another patient. Please pick another available slot.",
        },
      },
      409,
    );
  }

  // 4. Generate collision-free token & dispatch instant WhatsApp confirmation from Eternal Polyclinic
  const token = generateToken(req.date, doctor.id, false, state.appointments);
  const appointment: Appointment = {
    token,
    doctorId: doctor.id,
    doctorName: doctor.name ?? doctor.speciality,
    speciality: doctor.speciality,
    date: req.date,
    time: req.time,
    patientName: req.name.trim(),
    patientPhone: req.phone,
    patientAddress: req.address?.trim() || undefined,
    type: "online",
    status: "confirmed",
    createdAt: now.getTime(),
  };

  // Links the booking to the patient record and sends the WhatsApp confirmation once (logged in Notifications).
  let waResult: { sent: boolean; channel: string; error?: string };
  try {
    waResult = await afterAppointmentSaved(context.env, appointment);
  } catch (err) {
    waResult = { sent: false, channel: "error", error: err instanceof Error ? err.message : "Notification error" };
  }
  if (waResult.sent) {
    appointment.whatsappSent = true;
  }

  await applyCloudMutation(driver, { op: "upsert_appointment", appointment }, now);

  return jsonResponse({
    ok: true,
    appointment,
    whatsapp: waResult,
  });
}

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const rl = checkRateLimit("book_get", clientIp(context.request), 20, 5 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false, appointments: [] }, 503);
  }

  const url = new URL(context.request.url);
  const cleanPhone = normalizePhone(url.searchParams.get("phone") ?? "");
  const tokenFilter = (url.searchParams.get("token") ?? "").trim().toUpperCase();

  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return jsonResponse(
      { ok: false, error: "Enter the 10-digit mobile number used during booking." },
      400,
    );
  }

  const now = new Date();
  const todayKey = clinicTodayKey(now);
  const state = await readClinicState(driver, now);

  const matches = state.appointments
    .filter((a) => {
      if (a.patientPhone !== cleanPhone) return false;
      if (tokenFilter && a.token.toUpperCase() !== tokenFilter) return false;
      return a.date >= todayKey || a.status !== "cancelled";
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .map((a) => ({
      ...a,
      doctorLiveStatus: a.date === todayKey ? state.doctorStatuses[a.doctorId] ?? null : null,
    }));

  return jsonResponse({
    ok: true,
    appointments: matches,
  });
}

export async function onRequestDelete(context: CfPagesContext): Promise<Response> {
  const originErr = checkSameOrigin(context.request);
  if (originErr) return originErr;
  const rl = checkRateLimit("book_delete", clientIp(context.request), 10, 5 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfterSec);

  const driver = resolveStorageDriver(context.env);
  if (!driver) {
    return jsonResponse({ ok: false, configured: false }, 503);
  }

  let body: { token?: string; phone?: string };
  try {
    body = (await context.request.json()) as { token?: string; phone?: string };
  } catch {
    return jsonResponse({ ok: false, error: "Invalid cancellation request." }, 400);
  }

  const token = (body.token ?? "").trim().toUpperCase();
  const cleanPhone = normalizePhone(body.phone ?? "");
  if (!token || !/^[6-9]\d{9}$/.test(cleanPhone)) {
    return jsonResponse({ ok: false, error: "Provide both your Token No and 10-digit mobile number." }, 400);
  }

  const now = new Date();
  const state = await readClinicState(driver, now);
  const target = state.appointments.find(
    (a) => a.token.toUpperCase() === token && a.patientPhone === cleanPhone,
  );

  if (!target) {
    return jsonResponse({ ok: false, error: "No matching appointment found for that token and mobile number." }, 404);
  }

  await applyCloudMutation(
    driver,
    { op: "update_appointment_status", token: target.token, status: "cancelled" },
    now,
  );
  if (context.env.EP_SQL) {
    await setAppointmentRecordStatus(context.env.EP_SQL, target.token, "cancelled").catch(() => undefined);
  }

  return jsonResponse({ ok: true, cancelledToken: target.token });
}

