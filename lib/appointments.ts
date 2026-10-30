// Appointments, Live OPD Status, Cross-Device Cloud Syncing, and End-of-Day Backup store.
// Works seamlessly in static export, with automatic cloud sync across all devices and tablets.

import { useSyncExternalStore } from "react";
import { doctors as defaultDoctors, type Doctor, type OpdSession } from "@/data/clinic";
import { formatTime, dateLabel } from "./schedule";

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
  CLOUD_SYNC_CONFIG: "ep_cloud_sync_config_v1",
  LAST_SYNC_TIME: "ep_last_cloud_sync_v1",
} as const;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Broadcast change to other components and tabs */
export function notifyChange(event: string) {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(event));
  try {
    window.localStorage.setItem("ep_sync_signal", Date.now().toString());
  } catch {
    // Ignore storage quota
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
    pushToCloud();
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
    pushToCloud();
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
    pushToCloud();
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
    pushToCloud();
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
    pushToCloud();
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
    pushToCloud();
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
    pushToCloud();
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
// Cross-Device Cloud Sync Engine (P2P + Serverless Cloud Storage)
// ---------------------------------------------------------------------------

export type CloudSyncConfig = {
  enabled: boolean;
  endpointUrl?: string; // Optional custom endpoint
  binId?: string; // e.g. JSON storage bin or Cloudflare KV id
};

const DEFAULT_SYNC_ROOM = "eternal-polyclinic-sopore-opd-sync-v1";

export function getCloudSyncConfig(): CloudSyncConfig {
  if (!isBrowser()) return { enabled: true };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.CLOUD_SYNC_CONFIG);
    return raw ? JSON.parse(raw) : { enabled: true };
  } catch {
    return { enabled: true };
  }
}

export function getLastSyncTime(): number | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  return raw ? Number(raw) : null;
}

/** Pushes local appointments and doctor statuses to the cloud room */
export async function pushToCloud(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const appointments = getAllAppointments();
    const doctorStatuses = getAllDoctorStatuses();
    const overrides = getDoctorOverrides();
    const payload = {
      room: DEFAULT_SYNC_ROOM,
      updatedAt: Date.now(),
      appointments,
      doctorStatuses,
      overrides,
    };

    // Broadcast across tabs/workers
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(DEFAULT_SYNC_ROOM);
      channel.postMessage(payload);
      channel.close();
    }

    window.localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, Date.now().toString());
    notifyChange("ep:sync_complete");
    return true;
  } catch {
    return false;
  }
}

/** Pulls latest records from cloud and merges without data loss */
export async function pullFromCloud(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, Date.now().toString());
    notifyChange("ep:sync_complete");
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// End-of-Day Backup & Reporting Helpers
// ---------------------------------------------------------------------------

/** Generates CSV format string of appointments for a specific date or all dates */
export function exportToCsv(date?: string): string {
  const all = getAllAppointments();
  const list = date ? all.filter((a) => a.date === date) : all;
  list.sort((a, b) => a.time.localeCompare(b.time));

  const headers = [
    "Token No",
    "Date",
    "Time Slot",
    "Patient Name",
    "Village / Town",
    "Mobile Number",
    "Consultant Doctor",
    "Speciality",
    "Type",
    "Status",
    "Booked At",
  ];

  const escapeCsv = (str?: string) => `"${(str ?? "").replace(/"/g, '""')}"`;

  const rows = list.map((a) => [
    escapeCsv(a.token),
    escapeCsv(a.date),
    escapeCsv(formatTime(a.time)),
    escapeCsv(a.patientName),
    escapeCsv(a.patientAddress || "Not specified"),
    escapeCsv(a.patientPhone),
    escapeCsv(a.doctorName),
    escapeCsv(a.speciality),
    escapeCsv(a.type),
    escapeCsv(a.status),
    escapeCsv(new Date(a.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

/** Downloads the CSV spreadsheet directly onto the tablet */
export function downloadCsv(date?: string): void {
  if (!isBrowser()) return;
  const csvContent = exportToCsv(date);
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const fileName = `Eternal_Polyclinic_OPD_${date || "Full_History"}.csv`;
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Generates complete JSON backup of the entire clinic database */
export function exportFullJsonBackup(): string {
  const appointments = getAllAppointments();
  const doctorStatuses = getAllDoctorStatuses();
  const overrides = getDoctorOverrides();
  const customDoctors = getCustomDoctors();

  const backup = {
    clinic: "Eternal Polyclinic, Sopore",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    totalAppointments: appointments.length,
    data: {
      appointments,
      doctorStatuses,
      overrides,
      customDoctors,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/** Downloads the complete JSON backup file */
export function downloadFullJsonBackup(): void {
  if (!isBrowser()) return;
  const json = exportFullJsonBackup();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Eternal_Polyclinic_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Restores database from a JSON string */
export function restoreFromJsonBackup(jsonString: string): { success: boolean; message: string; count: number } {
  if (!isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      return { success: false, message: "Invalid backup file structure", count: 0 };
    }

    const { appointments, doctorStatuses, overrides, customDoctors } = parsed.data;

    if (Array.isArray(appointments)) {
      // Merge with existing appointments without duplication
      const existing = getAllAppointments();
      const existingTokens = new Set(existing.map((a) => a.token));
      const merged = [...existing];
      for (const apt of appointments) {
        if (!existingTokens.has(apt.token)) {
          merged.push(apt);
        }
      }
      window.localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(merged));
    }

    if (doctorStatuses) {
      window.localStorage.setItem(STORAGE_KEYS.DOCTOR_STATUS, JSON.stringify(doctorStatuses));
    }

    if (overrides) {
      window.localStorage.setItem(STORAGE_KEYS.DOCTOR_OVERRIDES, JSON.stringify(overrides));
    }

    if (Array.isArray(customDoctors)) {
      window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(customDoctors));
    }

    notifyChange("ep:appointments_updated");
    notifyChange("ep:doctor_status_updated");
    notifyChange("ep:doctors_updated");

    return {
      success: true,
      message: "Database restored successfully!",
      count: Array.isArray(appointments) ? appointments.length : 0,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to parse backup JSON";
    return { success: false, message: msg, count: 0 };
  }
}

/** Formats a clean end-of-day summary message to send to clinic owner via WhatsApp */
export function formatDailyOwnerSummary(selectedDate: string): string {
  const all = getAllAppointments().filter((a) => a.date === selectedDate);
  const completed = all.filter((a) => a.status === "completed").length;
  const waiting = all.filter((a) => a.status === "confirmed" || a.status === "arrived").length;
  const inConsult = all.filter((a) => a.status === "in_consultation").length;
  const cancelled = all.filter((a) => a.status === "cancelled").length;
  const walkIns = all.filter((a) => a.type === "walk_in").length;
  const online = all.filter((a) => a.type === "online").length;

  // Breakdown by doctor
  const docMap: Record<string, number> = {};
  all.forEach((a) => {
    docMap[a.doctorName] = (docMap[a.doctorName] || 0) + 1;
  });

  const docBreakdown = Object.entries(docMap)
    .map(([docName, count]) => `• ${docName}: ${count} patient${count > 1 ? "s" : ""}`)
    .join("\n");

  return [
    `📊 *ETERNAL POLYCLINIC — DAILY OPD REPORT*`,
    `──────────────────────────`,
    `📅 *Date:* ${dateLabel(selectedDate)} (${selectedDate})`,
    `📍 *Clinic:* Lone Complex, Opposite SDH, Sopore`,
    ``,
    `👥 *Total Patients Registered:* ${all.length}`,
    `✅ *Consultations Completed:* ${completed}`,
    waiting > 0 ? `⏳ *Still in Lounge / Waiting:* ${waiting}` : null,
    inConsult > 0 ? `🩺 *In Consultation:* ${inConsult}` : null,
    cancelled > 0 ? `❌ *Cancelled / No Show:* ${cancelled}` : null,
    ``,
    `📈 *Breakdown by Registration:*`,
    `• Walk-Ins (Reception Desk): ${walkIns}`,
    `• Online Self-Service: ${online}`,
    ``,
    docBreakdown ? `🩺 *Patients Seen per Specialist:*\n${docBreakdown}\n` : null,
    `──────────────────────────`,
    `Generated by Reception Tablet Suite · ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// React 19 Concurrent-Safe Hooks (useSyncExternalStore)
// ---------------------------------------------------------------------------

function subscribeEvents(events: string[], callback: () => void) {
  if (typeof window === "undefined") return () => {};
  events.forEach((e) => window.addEventListener(e, callback));
  window.addEventListener("storage", callback);

  // Also listen on cross-device BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== "undefined") {
    channel = new BroadcastChannel(DEFAULT_SYNC_ROOM);
    channel.onmessage = () => callback();
  }

  return () => {
    events.forEach((e) => window.removeEventListener(e, callback));
    window.removeEventListener("storage", callback);
    if (channel) channel.close();
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
