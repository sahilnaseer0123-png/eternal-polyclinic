// Appointments, Live OPD Status, and Doctor Schedule Management store.
// Works seamlessly in static export, with real-time sync across browser tabs and devices.

import { useSyncExternalStore } from "react";
import { doctors as defaultDoctors, type Doctor, type OpdSession } from "@/data/clinic";
import { formatTime } from "./schedule";

export type AppointmentStatus = "confirmed" | "arrived" | "in_consultation" | "completed" | "cancelled";

export type Appointment = {
  token: string; // e.g. "EP-AK1031-01"
  doctorId: string;
  doctorName: string;
  speciality: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "10:30"
  patientName: string;
  patientPhone: string;
  patientAddress?: string; // Village, Town, or Area (e.g. "Tarzoo, Sopore")
  type: "online" | "walk_in";
  status: AppointmentStatus;
  createdAt: number;
  notes?: string;
};

export type DoctorLiveState = "scheduled" | "in_clinic" | "delayed" | "cancelled";

export type DoctorLiveStatus = {
  state: DoctorLiveState;
  delayMinutes?: number;
  note?: string;
  updatedAt?: number;
};

export type DoctorOverride = {
  onLeave?: boolean;
  leaveUntil?: string; // "YYYY-MM-DD"
  customOpd?: OpdSession[];
  customFee?: string;
  notes?: string;
};

const STORAGE_KEYS = {
  APPOINTMENTS: "ep_appointments_v1",
  DOCTOR_STATUS: "ep_doctor_status_v1",
  CUSTOM_DOCTORS: "ep_custom_doctors_v1",
  DOCTOR_OVERRIDES: "ep_doctor_overrides_v1",
  LAST_RECEIPT: "ep_last_receipt_token_v1",
  ADMIN_PIN: "ep_admin_pin_v1",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Broadcast change to other components and tabs */
export function notifyChange(event: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(event));
  // Cross-tab trigger via storage event
  try {
    window.localStorage.setItem("ep_sync_signal", Date.now().toString());
  } catch {
    // Ignore storage quota errors
  }
}

// ---------------------------------------------------------------------------
// Appointments & Slots
// ---------------------------------------------------------------------------

export function getAllAppointments(): Appointment[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAppointment(appointment: Appointment): void {
  if (!isBrowser()) return;
  try {
    const all = getAllAppointments();
    const updated = [appointment, ...all.filter((a) => a.token !== appointment.token)];
    window.localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    window.localStorage.setItem(STORAGE_KEYS.LAST_RECEIPT, appointment.token);
    notifyChange("ep:appointments_updated");
  } catch (err) {
    console.error("Failed to save appointment", err);
  }
}

export function updateAppointmentStatus(token: string, status: AppointmentStatus): void {
  if (!isBrowser()) return;
  try {
    const all = getAllAppointments();
    const updated = all.map((a) => (a.token === token ? { ...a, status } : a));
    window.localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    notifyChange("ep:appointments_updated");
  } catch (err) {
    console.error("Failed to update status", err);
  }
}

export function deleteAppointment(token: string): void {
  if (!isBrowser()) return;
  try {
    const all = getAllAppointments();
    const updated = all.filter((a) => a.token !== token);
    window.localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(updated));
    notifyChange("ep:appointments_updated");
  } catch (err) {
    console.error("Failed to delete appointment", err);
  }
}

export function getBookedSlots(doctorId: string, date: string): string[] {
  const all = getAllAppointments();
  return all
    .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "cancelled")
    .map((a) => a.time);
}

export function isSlotBooked(doctorId: string, date: string, time: string): boolean {
  return getBookedSlots(doctorId, date).includes(time);
}

export function getLastReceipt(): Appointment | null {
  if (!isBrowser()) return null;
  const token = window.localStorage.getItem(STORAGE_KEYS.LAST_RECEIPT);
  if (!token) return null;
  const all = getAllAppointments();
  return all.find((a) => a.token === token) ?? null;
}

export function getAppointmentByToken(token: string): Appointment | null {
  const all = getAllAppointments();
  return all.find((a) => a.token.toUpperCase() === token.trim().toUpperCase()) ?? null;
}

/** Generates clean, predictable token numbers like #EP-AK1031-01 */
export function generateToken(date: string, doctorId: string, isWalkIn = false): string {
  const all = getAllAppointments();
  const forSitting = all.filter((a) => a.date === date && a.doctorId === doctorId);
  const nextNumber = forSitting.length + 1;
  const docCode = doctorId.slice(0, 2).toUpperCase();
  const dateCode = date.replace(/-/g, "").slice(4); // "1031" for Oct 31
  const suffix = isWalkIn ? "-W" : "";
  return `EP-${docCode}${dateCode}-${String(nextNumber).padStart(2, "0")}${suffix}`;
}

// ---------------------------------------------------------------------------
// Doctor Live Status & Delay Radar
// ---------------------------------------------------------------------------

export function getAllDoctorStatuses(): Record<string, DoctorLiveStatus> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.DOCTOR_STATUS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDoctorLiveStatus(doctorId: string): DoctorLiveStatus {
  const all = getAllDoctorStatuses();
  return all[doctorId] ?? { state: "scheduled" };
}

export function setDoctorLiveStatus(doctorId: string, status: DoctorLiveStatus): void {
  if (!isBrowser()) return;
  try {
    const all = getAllDoctorStatuses();
    all[doctorId] = { ...status, updatedAt: Date.now() };
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_STATUS, JSON.stringify(all));
    notifyChange("ep:doctor_status_updated");
  } catch (err) {
    console.error("Failed to update doctor status", err);
  }
}

// ---------------------------------------------------------------------------
// Doctor Schedule Overrides & Management
// ---------------------------------------------------------------------------

export function getDoctorOverrides(): Record<string, DoctorOverride> {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.DOCTOR_OVERRIDES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function setDoctorOverride(doctorId: string, override: Partial<DoctorOverride>): void {
  if (!isBrowser()) return;
  try {
    const all = getDoctorOverrides();
    all[doctorId] = { ...all[doctorId], ...override };
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_OVERRIDES, JSON.stringify(all));
    notifyChange("ep:doctors_updated");
  } catch (err) {
    console.error("Failed to update doctor override", err);
  }
}

export function getCustomDoctors(): Doctor[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_DOCTORS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomDoctor(doctor: Doctor): void {
  if (!isBrowser()) return;
  try {
    const custom = getCustomDoctors();
    const updated = [doctor, ...custom.filter((d) => d.id !== doctor.id)];
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(updated));
    notifyChange("ep:doctors_updated");
  } catch (err) {
    console.error("Failed to save custom doctor", err);
  }
}

export function removeCustomDoctor(doctorId: string): void {
  if (!isBrowser()) return;
  try {
    const custom = getCustomDoctors();
    const updated = custom.filter((d) => d.id !== doctorId);
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(updated));
    notifyChange("ep:doctors_updated");
  } catch (err) {
    console.error("Failed to remove custom doctor", err);
  }
}

/** Returns all active doctors including customized OPD schedules & custom added doctors */
export function getActiveDoctors(): Doctor[] {
  const overrides = getDoctorOverrides();
  const custom = getCustomDoctors();
  const mergedDefaults = defaultDoctors.map((doc) => {
    const ov = overrides[doc.id];
    if (!ov) return doc;
    return {
      ...doc,
      opd: ov.customOpd ?? doc.opd,
      availability: ov.onLeave ? `On Leave${ov.leaveUntil ? ` until ${ov.leaveUntil}` : ""}` : doc.availability,
    };
  });
  return [...mergedDefaults, ...custom];
}

// ---------------------------------------------------------------------------
// Security PIN for Reception Tablet
// ---------------------------------------------------------------------------

export const DEFAULT_ADMIN_PIN = "1234";

export function getAdminPin(): string {
  if (!isBrowser()) return DEFAULT_ADMIN_PIN;
  return window.localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || DEFAULT_ADMIN_PIN;
}

export function setAdminPin(pin: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
}

// ---------------------------------------------------------------------------
// Ticket / Broadcast Text Formatters
// ---------------------------------------------------------------------------

/** Formats a patient-facing ticket for WhatsApp or text message */
export function confirmationTicketText(apt: Appointment): string {
  return [
    `🏥 *ETERNAL POLYCLINIC, SOPORE*`,
    `*OPD Appointment Confirmation Slip*`,
    `──────────────────────────`,
    `🎟️ *Token No:* ${apt.token}`,
    `👤 *Patient:* ${apt.patientName}`,
    apt.patientAddress ? `📍 *Area/Village:* ${apt.patientAddress}` : null,
    `📱 *Mobile:* ${apt.patientPhone}`,
    `🩺 *Consultant:* ${apt.doctorName}`,
    `🔬 *Speciality:* ${apt.speciality}`,
    `📅 *Date:* ${apt.date}`,
    `⏰ *Slot Time:* ${formatTime(apt.time)}`,
    `──────────────────────────`,
    `📍 *Location:* 1st Floor, Lone Complex, Opposite SDH Hospital, Sopore`,
    `ℹ️ *Note:* Please arrive 10-15 minutes before your slot time and present this token slip at reception. Consultation fee is payable directly at reception.`,
    `📞 *Reception Helpline:* 97977 96909`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Formats an announcement message when a doctor is delayed or cancelled */
export function doctorDelayBroadcastText(doctorName: string, status: DoctorLiveStatus, clinicDate: string): string {
  if (status.state === "delayed") {
    return [
      `⚠️ *OPD DELAY NOTICE · ETERNAL POLYCLINIC*`,
      `──────────────────────────`,
      `Dear Patients,`,
      `This is an update regarding today's OPD for *${doctorName}* (${clinicDate}).`,
      ``,
      `⏱️ *Status:* Running approximately *${status.delayMinutes ?? 30} minutes* behind schedule.`,
      status.note ? `ℹ️ *Reason / Update:* ${status.note}` : `ℹ️ *Reason:* Highway travel / emergency delay.`,
      ``,
      `If you are traveling from outside Sopore, please adjust your departure time accordingly to avoid waiting.`,
      `📞 *Reception Helpline:* 97977 96909`,
    ].join("\n");
  }

  if (status.state === "cancelled") {
    return [
      `🚨 *OPD CANCELLATION NOTICE · ETERNAL POLYCLINIC*`,
      `──────────────────────────`,
      `Dear Patients,`,
      `We regret to inform you that *${doctorName}* will *not* be available today (${clinicDate}) due to ${status.note || "urgent hospital commitments"}.`,
      ``,
      `Your token will be rescheduled to the doctor's next visit with first priority, or you can call us to rebook.`,
      `We sincerely apologize for the inconvenience caused.`,
      `📞 *Reception Helpline:* 97977 96909`,
    ].join("\n");
  }

  if (status.state === "in_clinic") {
    return [
      `✅ *DOCTOR ARRIVED · ETERNAL POLYCLINIC*`,
      `──────────────────────────`,
      `*${doctorName}* is now in the clinic and consultations have commenced.`,
      `Patients with early tokens are requested to report to the reception desk.`,
      `📞 *Reception Helpline:* 97977 96909`,
    ].join("\n");
  }

  return "";
}

// ---------------------------------------------------------------------------
// React 19 Concurrent-Safe Hooks (useSyncExternalStore)
// ---------------------------------------------------------------------------

function subscribeEvents(events: string[], callback: () => void) {
  if (typeof window === "undefined") return () => {};
  events.forEach((e) => window.addEventListener(e, callback));
  window.addEventListener("storage", callback);
  return () => {
    events.forEach((e) => window.removeEventListener(e, callback));
    window.removeEventListener("storage", callback);
  };
}

let cachedAppointments: Appointment[] = [];
let lastRawAppointments: string | null = null;
function getAppointmentsSnapshot(): Appointment[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
  if (raw === lastRawAppointments) return cachedAppointments;
  lastRawAppointments = raw;
  try {
    cachedAppointments = raw ? JSON.parse(raw) : [];
  } catch {
    cachedAppointments = [];
  }
  return cachedAppointments;
}
const serverEmptyList: Appointment[] = [];
function getServerAppointmentsSnapshot() {
  return serverEmptyList;
}

export function useAppointments(): Appointment[] {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:appointments_updated"], cb),
    getAppointmentsSnapshot,
    getServerAppointmentsSnapshot,
  );
}

let cachedDoctorStatuses: Record<string, DoctorLiveStatus> = {};
let lastRawDoctorStatuses: string | null = null;
function getDoctorStatusesSnapshot(): Record<string, DoctorLiveStatus> {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(STORAGE_KEYS.DOCTOR_STATUS);
  if (raw === lastRawDoctorStatuses) return cachedDoctorStatuses;
  lastRawDoctorStatuses = raw;
  try {
    cachedDoctorStatuses = raw ? JSON.parse(raw) : {};
  } catch {
    cachedDoctorStatuses = {};
  }
  return cachedDoctorStatuses;
}
const serverEmptyObj: Record<string, DoctorLiveStatus> = {};
function getServerDoctorStatusesSnapshot() {
  return serverEmptyObj;
}

export function useDoctorStatuses(): Record<string, DoctorLiveStatus> {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:doctor_status_updated"], cb),
    getDoctorStatusesSnapshot,
    getServerDoctorStatusesSnapshot,
  );
}

let cachedActiveDoctors: Doctor[] = defaultDoctors;
let lastDoctorSignal: string | null = null;
function getActiveDoctorsSnapshot(): Doctor[] {
  if (typeof window === "undefined") return defaultDoctors;
  const sig = (window.localStorage.getItem(STORAGE_KEYS.DOCTOR_OVERRIDES) || "") + (window.localStorage.getItem(STORAGE_KEYS.CUSTOM_DOCTORS) || "");
  if (sig === lastDoctorSignal) return cachedActiveDoctors;
  lastDoctorSignal = sig;
  cachedActiveDoctors = getActiveDoctors();
  return cachedActiveDoctors;
}
function getServerActiveDoctorsSnapshot() {
  return defaultDoctors;
}

export function useActiveDoctors(): Doctor[] {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:doctors_updated"], cb),
    getActiveDoctorsSnapshot,
    getServerActiveDoctorsSnapshot,
  );
}

let cachedLastReceipt: Appointment | null = null;
let lastReceiptToken: string | null = null;
function getLastReceiptSnapshot(): Appointment | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(STORAGE_KEYS.LAST_RECEIPT);
  if (token === lastReceiptToken) return cachedLastReceipt;
  lastReceiptToken = token;
  cachedLastReceipt = getLastReceipt();
  return cachedLastReceipt;
}
function getServerLastReceiptSnapshot() {
  return null;
}

export function useLastReceipt(): Appointment | null {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:appointments_updated"], cb),
    getLastReceiptSnapshot,
    getServerLastReceiptSnapshot,
  );
}
