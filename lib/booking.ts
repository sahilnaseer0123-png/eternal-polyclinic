// Booking request: validation and the WhatsApp message.
// V1 sends requests to the clinic on WhatsApp. The website stores nothing; the message lives in the WhatsApp chat.
// V2 will save the same validated data to the database.

import { z } from "zod";
import type { Doctor } from "@/data/clinic";
import { dateLabel, formatTime, nextOpdDates, timeSlots } from "@/lib/schedule";

export type BookingRequest = {
  doctorId: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  name: string;
  phone: string; // 10 digits
};

/** "+91 98765-43210" / "098765 43210" / "919876543210" -> "9876543210" */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/**
 * Checks a request against the real schedule at time `now`:
 * the doctor exists and has OPD days, the date is one of their next OPD dates,
 * and the time is a slot that hasn't passed yet.
 */
export function bookingSchema(doctors: Doctor[], now: Date) {
  return z
    .object({
      doctorId: z.string().min(1, "Choose a doctor."),
      date: z.string().min(1, "Choose a day."),
      time: z.string().min(1, "Choose a time."),
      name: z.string().trim().min(2, "Enter your name.").max(60, "Please shorten your name."),
      phone: z
        .string()
        .transform(normalizePhone)
        .refine((p) => /^[6-9]\d{9}$/.test(p), "Enter a 10-digit mobile number starting with 6, 7, 8 or 9."),
    })
    .superRefine((v, ctx) => {
      const doctor = doctors.find((d) => d.id === v.doctorId);
      if (!doctor) {
        if (v.doctorId) ctx.addIssue({ code: "custom", path: ["doctorId"], message: "Choose a doctor." });
        return;
      }
      if (doctor.opd.length === 0) {
        ctx.addIssue({ code: "custom", path: ["doctorId"], message: "This doctor's days aren't online yet. Please call to book." });
        return;
      }
      if (v.date && !nextOpdDates(doctor, now, 8).some((d) => d.date === v.date)) {
        ctx.addIssue({ code: "custom", path: ["date"], message: "That day is no longer available. Pick another." });
        return;
      }
      if (v.date && v.time && !timeSlots(doctor, v.date, now).includes(v.time)) {
        ctx.addIssue({ code: "custom", path: ["time"], message: "That time has passed. Pick another." });
      }
    });
}

export type BookingErrors = Partial<Record<keyof BookingRequest, string>>;

/** Validates and returns either the clean request or one message per field. */
export function validateBooking(
  input: BookingRequest,
  doctors: Doctor[],
  now: Date,
): { ok: true; data: BookingRequest } | { ok: false; errors: BookingErrors } {
  const result = bookingSchema(doctors, now).safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors: BookingErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof BookingRequest;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

/**
 * The WhatsApp text. Names the doctor, never the speciality or a reason:
 * a preview on a shared family phone reveals nothing sensitive.
 */
export function bookingMessage(request: BookingRequest, doctor: Doctor, clinicName: string): string {
  return [
    `Hello ${clinicName}, I would like an appointment.`,
    `Doctor: ${doctor.name ?? doctor.speciality}`,
    `Day: ${dateLabel(request.date)}`,
    `Time: ${formatTime(request.time)}`,
    `Name: ${request.name.trim()}`,
    `Mobile: ${request.phone}`,
  ].join("\n");
}

export function whatsappLink(clinicWhatsapp: string, message: string): string {
  return `https://wa.me/${clinicWhatsapp}?text=${encodeURIComponent(message)}`;
}
