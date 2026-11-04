// Appointments, Live OPD Status, Cloudflare Pages Functions Cloud Sync, and End-of-Day Backup store.
// Public pages pull anonymized live status & booked slots in memory (zero localStorage writes for visitors).
// Reception tablets & owner phones sync full OPD state via /api/admin/state with localStorage offline fallback.

import { useSyncExternalStore } from "react";
import { doctors as defaultDoctors, type Doctor, type OpdSession } from "@/data/clinic";
import { normalizePhone, type BookingErrors, type BookingRequest } from "./booking";
import { clinicClock, formatTime, dateLabel } from "./schedule";

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
  whatsappSent?: boolean;
};

export type DoctorLiveState = "scheduled" | "in_clinic" | "delayed" | "cancelled";

export type DoctorLiveStatus = {
  state: DoctorLiveState;
  delayMinutes?: number;
  note?: string;
  date?: string; // "YYYY-MM-DD" in clinic time so delays auto-expire the next day
  updatedAt?: number;
};

export type DoctorOverride = {
  onLeave?: boolean;
  deactivated?: boolean;
  leaveUntil?: string; // "YYYY-MM-DD"
  customOpd?: OpdSession[];
  customFee?: string;
  notes?: string;
};

export type PublicBookedSlot = {
  doctorId: string;
  date: string;
  time: string;
};

export type WhatsAppChannelStatus = "meta_cloud_api" | "twilio" | "webhook" | "unconfigured";

export type CloudConnectionState = {
  checked: boolean;
  configured: boolean;
  authenticated: boolean;
  storageDriver: "d1" | "kv" | "none";
  usingDefaultPin: boolean;
  whatsappChannel: WhatsAppChannelStatus;
  lastSyncedAt: number | null;
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

// In-memory live cloud cache for public visitors (never written to visitor localStorage)
let liveCloudLoaded = false;
let liveCloudLastFetch = 0;
let liveCloudDoctorStatuses: Record<string, DoctorLiveStatus> = {};
let liveCloudOverrides: Record<string, DoctorOverride> = {};
let liveCloudCustomDoctors: Doctor[] = [];
let liveCloudBookedSlots: PublicBookedSlot[] = [];
let liveCloudVersion = 0;

let cloudStatusSnapshot: CloudConnectionState = {
  checked: false,
  configured: false,
  authenticated: false,
  storageDriver: "none",
  usingDefaultPin: false,
  whatsappChannel: "unconfigured",
  lastSyncedAt: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function isStaffAuthenticatedInTab(): boolean {
  if (cloudStatusSnapshot.authenticated) return true;
  if (!isBrowser()) return false;
  try {
    return window.sessionStorage?.getItem("ep_reception_auth") === "true";
  } catch {
    return false;
  }
}

/** Broadcast change to other components and tabs */
export function notifyChange(event: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(event));
  if (isStaffAuthenticatedInTab() && isBrowser()) {
    try {
      window.localStorage.setItem("ep_sync_signal", Date.now().toString());
    } catch {
      // Ignore storage quota
    }
  }
}

function broadcastTabSync(payload: unknown) {
  if (typeof BroadcastChannel === "undefined") return;
  try {
    const channel = new BroadcastChannel(DEFAULT_SYNC_ROOM);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Ignore unsupported environments
  }
}

function filterTodayStatuses(raw: Record<string, DoctorLiveStatus>): Record<string, DoctorLiveStatus> {
  const todayKey = clinicClock(new Date()).dateKey;
  const active: Record<string, DoctorLiveStatus> = {};
  for (const [id, st] of Object.entries(raw)) {
    if (!st) continue;
    if (st.date && st.date !== todayKey) continue;
    active[id] = st;
  }
  return active;
}

// ---------------------------------------------------------------------------
// Public Live Feed Fetcher (GET /api/live — Zero PII, No Visitor LocalStorage)
// ---------------------------------------------------------------------------

let liveFetchPromise: Promise<boolean> | null = null;

export async function refreshPublicLiveState(force = false): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return false;
  const now = Date.now();
  if (!force && liveCloudLoaded && now - liveCloudLastFetch < 15_000) {
    return cloudStatusSnapshot.configured;
  }
  if (liveFetchPromise) return liveFetchPromise;

  liveFetchPromise = (async () => {
    try {
      const res = await fetch("/api/live", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      liveCloudLastFetch = Date.now();
      if (!res.ok) {
        liveCloudLoaded = true;
        return false;
      }
      const data = (await res.json()) as {
        configured?: boolean;
        updatedAt?: number;
        doctorStatuses?: Record<string, DoctorLiveStatus>;
        overrides?: Record<string, DoctorOverride>;
        customDoctors?: Doctor[];
        bookedSlots?: PublicBookedSlot[];
      };

      liveCloudLoaded = true;
      if (!data.configured) return false;

      liveCloudDoctorStatuses = filterTodayStatuses(data.doctorStatuses ?? {});
      liveCloudOverrides = data.overrides ?? {};
      liveCloudCustomDoctors = Array.isArray(data.customDoctors) ? data.customDoctors : [];
      liveCloudBookedSlots = Array.isArray(data.bookedSlots) ? data.bookedSlots : [];
      liveCloudVersion += 1;

      cloudStatusSnapshot = {
        ...cloudStatusSnapshot,
        checked: true,
        configured: true,
        lastSyncedAt: data.updatedAt || Date.now(),
      };

      notifyChange("ep:doctor_status_updated");
      notifyChange("ep:doctors_updated");
      notifyChange("ep:appointments_updated");
      notifyChange("ep:cloud_status_updated");
      return true;
    } catch {
      liveCloudLoaded = true;
      return false;
    } finally {
      liveFetchPromise = null;
    }
  })();

  return liveFetchPromise;
}

// ---------------------------------------------------------------------------
// Admin Cloud Auth & Atomic Mutation Dispatch (/api/admin/*)
// ---------------------------------------------------------------------------

type AdminStatePayload = {
  updatedAt: number;
  appointments: Appointment[];
  doctorStatuses: Record<string, DoctorLiveStatus>;
  overrides: Record<string, DoctorOverride>;
  customDoctors: Doctor[];
};

function applyAuthoritativeCloudStateToLocal(state: AdminStatePayload, storageDriver?: "d1" | "kv") {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(state.appointments ?? []));
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_STATUS, JSON.stringify(filterTodayStatuses(state.doctorStatuses ?? {})));
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_OVERRIDES, JSON.stringify(state.overrides ?? {}));
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(state.customDoctors ?? []));
    const ts = state.updatedAt || Date.now();
    window.localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, String(ts));

    liveCloudDoctorStatuses = filterTodayStatuses(state.doctorStatuses ?? {});
    liveCloudOverrides = state.overrides ?? {};
    liveCloudCustomDoctors = state.customDoctors ?? [];
    liveCloudBookedSlots = (state.appointments ?? [])
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({ doctorId: a.doctorId, date: a.date, time: a.time }));
    liveCloudVersion += 1;

    cloudStatusSnapshot = {
      ...cloudStatusSnapshot,
      checked: true,
      configured: true,
      authenticated: true,
      storageDriver: storageDriver ?? cloudStatusSnapshot.storageDriver,
      lastSyncedAt: ts,
    };

    notifyChange("ep:appointments_updated");
    notifyChange("ep:doctor_status_updated");
    notifyChange("ep:doctors_updated");
    notifyChange("ep:cloud_status_updated");
    notifyChange("ep:sync_complete");
  } catch (err) {
    console.error("Failed to cache cloud state locally", err);
  }
}

async function sendAdminCloudMutation(body: Record<string, unknown>): Promise<boolean> {
  if (typeof window === "undefined" || typeof fetch === "undefined") return false;
  if (!cloudStatusSnapshot.configured || !cloudStatusSnapshot.authenticated) {
    broadcastTabSync(body);
    return false;
  }
  try {
    const res = await fetch("/api/admin/state", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      cloudStatusSnapshot = { ...cloudStatusSnapshot, authenticated: false };
      notifyChange("ep:cloud_status_updated");
      return false;
    }
    if (!res.ok) return false;
    const data = (await res.json()) as {
      ok?: boolean;
      storageDriver?: "d1" | "kv";
      state?: AdminStatePayload;
    };
    if (data.ok && data.state) {
      applyAuthoritativeCloudStateToLocal(data.state, data.storageDriver);
      broadcastTabSync({ updatedAt: data.state.updatedAt });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** Checks whether Cloudflare D1/KV backend is configured and whether this staff browser has an active session */
export async function checkCloudAdminSession(): Promise<CloudConnectionState> {
  if (typeof window === "undefined" || typeof fetch === "undefined") {
    return cloudStatusSnapshot;
  }
  try {
    const res = await fetch("/api/admin/auth", {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      cloudStatusSnapshot = {
        ...cloudStatusSnapshot,
        checked: true,
        configured: false,
        authenticated: false,
        storageDriver: "none",
      };
      notifyChange("ep:cloud_status_updated");
      return cloudStatusSnapshot;
    }
    const data = (await res.json()) as {
      configured?: boolean;
      authenticated?: boolean;
      storageDriver?: "d1" | "kv" | "none";
      usingDefaultPin?: boolean;
      whatsappChannel?: WhatsAppChannelStatus;
    };
    cloudStatusSnapshot = {
      ...cloudStatusSnapshot,
      checked: true,
      configured: Boolean(data.configured),
      authenticated: Boolean(data.authenticated),
      storageDriver: data.storageDriver ?? "none",
      usingDefaultPin: Boolean(data.usingDefaultPin),
      whatsappChannel: data.whatsappChannel ?? "unconfigured",
    };
    notifyChange("ep:cloud_status_updated");

    if (cloudStatusSnapshot.configured && cloudStatusSnapshot.authenticated) {
      await pullFromCloud();
    }
    return cloudStatusSnapshot;
  } catch {
    cloudStatusSnapshot = {
      ...cloudStatusSnapshot,
      checked: true,
      configured: false,
      authenticated: false,
      storageDriver: "none",
    };
    notifyChange("ep:cloud_status_updated");
    return cloudStatusSnapshot;
  }
}

/** Verifies Admin PIN via Cloudflare Pages Function when configured, or falls back to local device PIN in local mode */
export async function loginAdminPortal(
  pin: string,
): Promise<{ ok: boolean; mode: "cloud" | "local"; error?: string; usingDefaultPin?: boolean }> {
  const cleanPin = pin.trim();
  if (!cleanPin) return { ok: false, mode: "local", error: "Please enter the security PIN." };

  if (typeof window !== "undefined" && typeof fetch !== "undefined") {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", pin: cleanPin }),
      });

      // 503 / 404 means Pages Function isn't running (e.g. `next dev`) or KV/D1 isn't bound yet -> local fallback
      if (res.status !== 404 && res.status !== 503) {
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          storageDriver?: "d1" | "kv";
          usingDefaultPin?: boolean;
        };
        if (!res.ok || !data.ok) {
          return { ok: false, mode: "cloud", error: data.error || "Incorrect PIN. Please try again." };
        }
        cloudStatusSnapshot = {
          ...cloudStatusSnapshot,
          checked: true,
          configured: true,
          authenticated: true,
          storageDriver: data.storageDriver ?? "kv",
          usingDefaultPin: Boolean(data.usingDefaultPin),
        };
        try {
          window.sessionStorage?.setItem("ep_reception_auth", "true");
        } catch {
          // Ignore
        }
        notifyChange("ep:cloud_status_updated");
        // Merge any offline appointments recorded on this tablet into cloud & pull latest state
        await pushToCloud();
        return { ok: true, mode: "cloud", usingDefaultPin: Boolean(data.usingDefaultPin) };
      }
    } catch {
      // Network offline or static dev server -> fall through to local device check
    }
  }

  // Local device fallback when cloud binding is not active yet
  const activeLocalPin = getAdminPin();
  if (cleanPin === activeLocalPin) {
    try {
      window.sessionStorage?.setItem("ep_reception_auth", "true");
    } catch {
      // Ignore
    }
    return { ok: true, mode: "local", usingDefaultPin: activeLocalPin === DEFAULT_ADMIN_PIN };
  }
  return { ok: false, mode: "local", error: "Incorrect PIN. Please try again." };
}

export async function logoutAdminPortal(): Promise<void> {
  try {
    window.sessionStorage?.removeItem("ep_reception_auth");
  } catch {
    // Ignore
  }
  if (cloudStatusSnapshot.configured && typeof fetch !== "undefined") {
    try {
      await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {
      // Ignore network errors on logout
    }
  }
  cloudStatusSnapshot = { ...cloudStatusSnapshot, authenticated: false };
  notifyChange("ep:cloud_status_updated");
}

export async function updateAdminPortalPin(
  newPin: string,
): Promise<{ ok: boolean; mode: "cloud" | "local"; error?: string }> {
  const trimmed = newPin.trim();
  if (trimmed.length < 4) {
    return { ok: false, mode: "local", error: "PIN must be at least 4 characters." };
  }

  if (cloudStatusSnapshot.configured && cloudStatusSnapshot.authenticated && typeof fetch !== "undefined") {
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_pin", newPin: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        return { ok: false, mode: "cloud", error: data.error || "Failed to update cloud PIN." };
      }
      setAdminPin(trimmed);
      cloudStatusSnapshot = { ...cloudStatusSnapshot, usingDefaultPin: false };
      notifyChange("ep:cloud_status_updated");
      return { ok: true, mode: "cloud" };
    } catch {
      return { ok: false, mode: "cloud", error: "Network error while updating cloud PIN." };
    }
  }

  setAdminPin(trimmed);
  return { ok: true, mode: "local" };
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
    void sendAdminCloudMutation({ op: "upsert_appointment", appointment });
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
    void sendAdminCloudMutation({ op: "update_appointment_status", token, status });
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
    void sendAdminCloudMutation({ op: "delete_appointment", token });
  } catch (err) {
    console.error("Failed to delete appointment", err);
  }
}

export function getBookedSlots(doctorId: string, date: string): string[] {
  const localSlots = getAllAppointments()
    .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "cancelled")
    .map((a) => a.time);
  const cloudSlots = liveCloudBookedSlots
    .filter((s) => s.doctorId === doctorId && s.date === date)
    .map((s) => s.time);
  return Array.from(new Set([...localSlots, ...cloudSlots]));
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

/** Generates clean, collision-free token numbers like EP-AK1031-01 (even if earlier tokens were deleted) */
export function generateToken(
  date: string,
  doctorId: string,
  isWalkIn = false,
  existingAppointments?: Appointment[],
): string {
  const all = existingAppointments ?? getAllAppointments();
  const forSitting = all.filter((a) => a.date === date && a.doctorId === doctorId);
  let maxSeq = 0;
  for (const a of forSitting) {
    const m = a.token.match(/-(\d+)(?:-W)?$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }
  const nextNumber = Math.max(maxSeq, forSitting.length) + 1;
  const cleanCode = doctorId.replace(/^dr\.?\s*/i, "").replace(/[^a-zA-Z0-9]/g, "");
  const docCode = (cleanCode.slice(0, 2) || "DR").toUpperCase();
  const dateCode = date.replace(/-/g, "").slice(4); // "1031" for Oct 31
  const suffix = isWalkIn ? "-W" : "";
  return `EP-${docCode}${dateCode}-${String(nextNumber).padStart(2, "0")}${suffix}`;
}


// ---------------------------------------------------------------------------
// Public on-website booking client (POST/GET/DELETE /api/book)
// ---------------------------------------------------------------------------

export type OnlineBookingResult =
  | { ok: true; appointment: Appointment; whatsappSent: boolean; alreadyBooked?: boolean }
  | { ok: false; errors: BookingErrors; message?: string; status: number };

export async function submitOnlineBooking(payload: BookingRequest & { website?: string }): Promise<OnlineBookingResult> {
  try {
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 404 || res.status === 503) return localBookingFallback(payload);
    const data = (await res.json()) as {
      ok?: boolean;
      appointment?: Appointment;
      alreadyBooked?: boolean;
      whatsapp?: { sent?: boolean };
      errors?: BookingErrors;
      error?: string;
    };
    if (res.ok && data.ok && data.appointment) {
      void refreshPublicLiveState(true);
      return {
        ok: true,
        appointment: data.appointment,
        whatsappSent: Boolean(data.whatsapp?.sent),
        alreadyBooked: data.alreadyBooked,
      };
    }
    if (res.status === 409) void refreshPublicLiveState(true);
    return { ok: false, errors: data.errors ?? {}, message: data.error, status: res.status };
  } catch {
    return {
      ok: false,
      errors: {},
      message: "Could not reach the booking server. Check your internet or call reception.",
      status: 0,
    };
  }
}

function localBookingFallback(payload: BookingRequest): OnlineBookingResult {
  // Local `next dev` (no Pages Functions): keep the flow working on this device only.
  const doctor = getActiveDoctors().find((d) => d.id === payload.doctorId);
  if (!doctor) return { ok: false, errors: { doctorId: "Please choose a doctor." }, status: 422 };
  if (isSlotBooked(doctor.id, payload.date, payload.time)) {
    return { ok: false, errors: { time: "That time slot is already booked. Please pick another." }, status: 409 };
  }
  const appointment: Appointment = {
    token: generateToken(payload.date, doctor.id, false),
    doctorId: doctor.id,
    doctorName: doctor.name ?? doctor.speciality,
    speciality: doctor.speciality,
    date: payload.date,
    time: payload.time,
    patientName: payload.name.trim(),
    patientPhone: normalizePhone(payload.phone),
    patientAddress: payload.address?.trim() || undefined,
    type: "online",
    status: "confirmed",
    createdAt: Date.now(),
  };
  saveAppointment(appointment);
  return { ok: true, appointment, whatsappSent: false };
}

export type LookupAppointment = Appointment & { doctorLiveStatus?: DoctorLiveStatus | null };

export async function lookupBookingsByPhone(
  phone: string,
  token?: string,
): Promise<{ ok: true; appointments: LookupAppointment[] } | { ok: false; error: string }> {
  const clean = normalizePhone(phone);
  try {
    const qs = new URLSearchParams({ phone: clean });
    if (token?.trim()) qs.set("token", token.trim());
    const res = await fetch(`/api/book?${qs.toString()}`, { cache: "no-store" });
    if (res.status === 404 || res.status === 503) {
      const t = token?.trim().toUpperCase();
      return {
        ok: true,
        appointments: getAllAppointments().filter(
          (a) => a.patientPhone === clean && (!t || a.token.toUpperCase() === t),
        ),
      };
    }
    const data = (await res.json()) as { ok?: boolean; appointments?: LookupAppointment[]; error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Could not look up your token." };
    return { ok: true, appointments: data.appointments ?? [] };
  } catch {
    return { ok: false, error: "Could not reach the server. Please try again or call reception." };
  }
}

export async function cancelOnlineBooking(token: string, phone: string): Promise<{ ok: boolean; error?: string }> {
  const clean = normalizePhone(phone);
  try {
    const res = await fetch("/api/book", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone: clean }),
    });
    if (res.status === 404 && !(await res.clone().json().catch(() => null))?.error) {
      updateAppointmentStatus(token, "cancelled");
      return { ok: true };
    }
    if (res.status === 503) {
      updateAppointmentStatus(token, "cancelled");
      return { ok: true };
    }
    const data = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) return { ok: false, error: data.error ?? "Could not cancel. Please call reception." };
    void refreshPublicLiveState(true);
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach the server. Please call reception." };
  }
}

// ---------------------------------------------------------------------------
// Doctor Live Status & Delay Radar
// ---------------------------------------------------------------------------

export function getAllDoctorStatuses(): Record<string, DoctorLiveStatus> {
  const localRaw: Record<string, DoctorLiveStatus> = (() => {
    if (!isBrowser()) return {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.DOCTOR_STATUS);
      return raw ? filterTodayStatuses(JSON.parse(raw)) : {};
    } catch {
      return {};
    }
  })();

  const merged: Record<string, DoctorLiveStatus> = { ...localRaw };
  for (const [id, cloudSt] of Object.entries(filterTodayStatuses(liveCloudDoctorStatuses))) {
    const cur = merged[id];
    if (!cur || (cloudSt.updatedAt ?? 0) >= (cur.updatedAt ?? 0)) {
      merged[id] = cloudSt;
    }
  }
  return merged;
}

export function getDoctorLiveStatus(doctorId: string): DoctorLiveStatus {
  const all = getAllDoctorStatuses();
  return all[doctorId] ?? { state: "scheduled" };
}

export function setDoctorLiveStatus(doctorId: string, status: DoctorLiveStatus): void {
  if (!isBrowser()) return;
  try {
    const todayKey = clinicClock(new Date()).dateKey;
    const stamped: DoctorLiveStatus = {
      ...status,
      date: status.date ?? todayKey,
      updatedAt: Date.now(),
    };
    const all = getAllDoctorStatuses();
    if (stamped.state === "scheduled" && !stamped.note) {
      delete all[doctorId];
      delete liveCloudDoctorStatuses[doctorId];
    } else {
      all[doctorId] = stamped;
      liveCloudDoctorStatuses[doctorId] = stamped;
    }
    liveCloudVersion += 1;
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_STATUS, JSON.stringify(all));
    notifyChange("ep:doctor_status_updated");
    void sendAdminCloudMutation({ op: "set_doctor_status", doctorId, status: stamped });
  } catch (err) {
    console.error("Failed to update doctor status", err);
  }
}

// ---------------------------------------------------------------------------
// Doctor Schedule Overrides & Management
// ---------------------------------------------------------------------------

export function getDoctorOverrides(): Record<string, DoctorOverride> {
  let local: Record<string, DoctorOverride> = {};
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.DOCTOR_OVERRIDES);
      local = raw ? JSON.parse(raw) : {};
    } catch {
      local = {};
    }
  }
  return { ...local, ...liveCloudOverrides };
}

export function setDoctorOverride(doctorId: string, override: Partial<DoctorOverride>): void {
  if (!isBrowser()) return;
  try {
    const all = getDoctorOverrides();
    all[doctorId] = { ...all[doctorId], ...override };
    liveCloudOverrides[doctorId] = all[doctorId];
    liveCloudVersion += 1;
    window.localStorage.setItem(STORAGE_KEYS.DOCTOR_OVERRIDES, JSON.stringify(all));
    notifyChange("ep:doctors_updated");
    void sendAdminCloudMutation({ op: "set_doctor_override", doctorId, override });
  } catch (err) {
    console.error("Failed to update doctor override", err);
  }
}

export function getCustomDoctors(): Doctor[] {
  let local: Doctor[] = [];
  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.CUSTOM_DOCTORS);
      local = raw ? JSON.parse(raw) : [];
    } catch {
      local = [];
    }
  }
  if (liveCloudCustomDoctors.length === 0) return local;
  const byId = new Map<string, Doctor>();
  for (const d of liveCloudCustomDoctors) byId.set(d.id, d);
  for (const d of local) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return Array.from(byId.values());
}

export function saveCustomDoctor(doctor: Doctor): void {
  if (!isBrowser()) return;
  try {
    const custom = getCustomDoctors();
    const updated = [doctor, ...custom.filter((d) => d.id !== doctor.id)];
    liveCloudCustomDoctors = updated;
    liveCloudVersion += 1;
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(updated));
    notifyChange("ep:doctors_updated");
    void sendAdminCloudMutation({ op: "save_custom_doctor", doctor });
  } catch (err) {
    console.error("Failed to save custom doctor", err);
  }
}

export function removeCustomDoctor(doctorId: string): void {
  if (!isBrowser()) return;
  try {
    const custom = getCustomDoctors();
    const updated = custom.filter((d) => d.id !== doctorId);
    liveCloudCustomDoctors = updated;
    liveCloudVersion += 1;
    window.localStorage.setItem(STORAGE_KEYS.CUSTOM_DOCTORS, JSON.stringify(updated));
    notifyChange("ep:doctors_updated");
    void sendAdminCloudMutation({ op: "remove_custom_doctor", doctorId });
  } catch (err) {
    console.error("Failed to remove custom doctor", err);
  }
}

export function isBuiltInDoctor(doctorId: string): boolean {
  return defaultDoctors.some((d) => d.id === doctorId);
}

export function isDoctorOnLeave(doctor: Doctor): boolean {
  return Boolean(doctor.availability?.toLowerCase().startsWith("on leave"));
}

/** Returns all active doctors including customized OPD schedules & custom added doctors */
export function getActiveDoctors(): Doctor[] {
  const overrides = getDoctorOverrides();
  const custom = getCustomDoctors();
  const mergedDefaults = defaultDoctors
    .filter((doc) => !overrides[doc.id]?.deactivated)
    .map((doc) => {
      const ov = overrides[doc.id];
      if (!ov) return doc;
      return {
        ...doc,
        opd: ov.customOpd ?? doc.opd,
        availability: ov.onLeave
          ? `On Leave${ov.leaveUntil ? ` until ${ov.leaveUntil}` : ""}`
          : doc.availability,
      };
    });
  return [...mergedDefaults, ...custom];
}

// ---------------------------------------------------------------------------
// Security PIN for Local Fallback Mode
// ---------------------------------------------------------------------------

export const DEFAULT_ADMIN_PIN = "1234";

export function getAdminPin(): string {
  if (!isBrowser()) return DEFAULT_ADMIN_PIN;
  return (
    window.localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) ||
    window.localStorage.getItem("ep_admin_pin") ||
    DEFAULT_ADMIN_PIN
  );
}

export function setAdminPin(pin: string): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
  window.localStorage.removeItem("ep_admin_pin");
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
// Cross-Device Cloud Sync Engine (Cloudflare D1 / KV + Local Tab Broadcast)
// ---------------------------------------------------------------------------

export type CloudSyncConfig = {
  enabled: boolean;
  endpointUrl?: string;
  binId?: string;
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
  if (cloudStatusSnapshot.lastSyncedAt) return cloudStatusSnapshot.lastSyncedAt;
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIME);
  return raw ? Number(raw) : null;
}

/** Merges local reception records with Cloudflare D1/KV and broadcasts across local browser tabs */
export async function pushToCloud(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    const appointments = getAllAppointments();
    const doctorStatuses = getAllDoctorStatuses();
    const overrides = getDoctorOverrides();
    const customDoctors = getCustomDoctors();
    const payload = {
      room: DEFAULT_SYNC_ROOM,
      updatedAt: Date.now(),
      appointments,
      doctorStatuses,
      overrides,
      customDoctors,
    };

    broadcastTabSync(payload);

    if (cloudStatusSnapshot.configured && cloudStatusSnapshot.authenticated) {
      const synced = await sendAdminCloudMutation({
        op: "sync_merge",
        appointments,
        doctorStatuses,
        overrides,
        customDoctors,
      });
      if (synced) return true;
    }

    window.localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIME, Date.now().toString());
    notifyChange("ep:sync_complete");
    return true;
  } catch {
    return false;
  }
}

/** Pulls latest records from Cloudflare D1/KV (for authenticated staff) or public live state (for visitors) */
export async function pullFromCloud(): Promise<boolean> {
  if (!isBrowser()) return false;
  try {
    if (cloudStatusSnapshot.configured && cloudStatusSnapshot.authenticated && typeof fetch !== "undefined") {
      const res = await fetch("/api/admin/state", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          ok?: boolean;
          storageDriver?: "d1" | "kv";
          state?: AdminStatePayload;
        };
        if (data.ok && data.state) {
          applyAuthoritativeCloudStateToLocal(data.state, data.storageDriver);
          return true;
        }
      }
    }

    return await refreshPublicLiveState(true);
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

/** Restores database from a JSON string and syncs to cloud if authenticated */
export function restoreFromJsonBackup(jsonString: string): { success: boolean; message: string; count: number } {
  if (!isBrowser()) return { success: false, message: "Browser environment required", count: 0 };
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data) {
      return { success: false, message: "Invalid backup file structure", count: 0 };
    }

    const { appointments, doctorStatuses, overrides, customDoctors } = parsed.data;

    if (Array.isArray(appointments)) {
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
    void pushToCloud();

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

/** Formats a clean end-of-day summary message to send to clinic owner via WhatsApp. */
export function formatDailyOwnerSummary(selectedDate: string, doctorIdFilter: string = "all"): string {
  const allDateApts = getAllAppointments().filter((a) => a.date === selectedDate);
  const filtered = doctorIdFilter === "all"
    ? allDateApts
    : allDateApts.filter((a) => a.doctorId === doctorIdFilter);

  const completed = filtered.filter((a) => a.status === "completed").length;
  const waiting = filtered.filter((a) => a.status === "confirmed" || a.status === "arrived").length;
  const inConsult = filtered.filter((a) => a.status === "in_consultation").length;
  const cancelled = filtered.filter((a) => a.status === "cancelled").length;
  const walkIns = filtered.filter((a) => a.type === "walk_in").length;
  const online = filtered.filter((a) => a.type === "online").length;

  type DocStat = { name: string; speciality: string; total: number; done: number; waiting: number; cancelled: number };
  const doctorStatsMap: Record<string, DocStat> = {};

  filtered.forEach((a) => {
    if (!doctorStatsMap[a.doctorId]) {
      doctorStatsMap[a.doctorId] = {
        name: a.doctorName,
        speciality: a.speciality,
        total: 0,
        done: 0,
        waiting: 0,
        cancelled: 0,
      };
    }
    const stat = doctorStatsMap[a.doctorId];
    stat.total += 1;
    if (a.status === "completed") stat.done += 1;
    else if (a.status === "confirmed" || a.status === "arrived" || a.status === "in_consultation") stat.waiting += 1;
    else if (a.status === "cancelled") stat.cancelled += 1;
  });

  const docEntries = Object.values(doctorStatsMap);

  const doctorSections = docEntries.map((d, index) => {
    return [
      `🩺 *${index + 1}. ${d.name}* (${d.speciality})`,
      `   • Total Booked: *${d.total}* (✅ Done: ${d.done}${d.waiting > 0 ? `, ⏳ Waiting: ${d.waiting}` : ""}${d.cancelled > 0 ? `, ❌ Cancelled: ${d.cancelled}` : ""})`,
    ].join("\n");
  }).join("\n\n");

  const reportHeaderTitle = doctorIdFilter === "all"
    ? `📊 *ETERNAL POLYCLINIC — ALL DOCTORS OPD REPORT*`
    : `📊 *ETERNAL POLYCLINIC — OPD REPORT (${filtered[0]?.doctorName || "Doctor"})*`;

  return [
    reportHeaderTitle,
    `──────────────────────────`,
    `📅 *Date:* ${dateLabel(selectedDate)} (${selectedDate})`,
    `📍 *Location:* Lone Complex, Opposite SDH, Sopore`,
    ``,
    `👥 *Clinic Total Patients:* ${filtered.length}`,
    `✅ *Total Consultations Done:* ${completed}`,
    waiting > 0 ? `⏳ *Total In Lounge / Waiting:* ${waiting}` : null,
    inConsult > 0 ? `🚪 *Currently In Cabin:* ${inConsult}` : null,
    cancelled > 0 ? `❌ *Total Cancelled / No-Show:* ${cancelled}` : null,
    ``,
    `📈 *Registration Channel:*`,
    `• Walk-Ins (Reception Desk): ${walkIns}`,
    `• Online Patient Self-Service: ${online}`,
    ``,
    docEntries.length > 0 ? `📋 *Doctor-by-Doctor Breakdown (${docEntries.length} Doctor${docEntries.length > 1 ? "s" : ""}):*\n\n${doctorSections}\n` : `ℹ️ No appointments recorded for this filter.`,
    `──────────────────────────`,
    `📱 *Helpline:* 97977 96909`,
    `Generated by Reception Tablet Suite · ${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST`,
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// React 19 Concurrent-Safe Hooks (useSyncExternalStore)
// ---------------------------------------------------------------------------

let autoRefreshListenersAttached = false;

function ensurePublicAutoRefresh() {
  if (typeof window === "undefined") return;
  if (!liveCloudLoaded) {
    void refreshPublicLiveState(false);
  }
  if (autoRefreshListenersAttached) return;
  autoRefreshListenersAttached = true;

  const onVisible = () => {
    if (document.visibilityState === "visible") {
      void refreshPublicLiveState(false);
    }
  };
  window.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
}

function subscribeEvents(events: string[], callback: () => void, pullPublic = false) {
  if (typeof window === "undefined") return () => {};
  if (pullPublic) ensurePublicAutoRefresh();

  events.forEach((e) => window.addEventListener(e, callback));
  window.addEventListener("storage", callback);

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
    (cb) => subscribeEvents(["ep:appointments_updated"], cb, false),
    getAppointmentsSnapshot,
    getServerAppointmentsSnapshot,
  );
}

let cachedPublicSlots: PublicBookedSlot[] = [];
let lastPublicSlotsVersion = -1;
function getPublicBookedSlotsSnapshot(): PublicBookedSlot[] {
  if (typeof window === "undefined") return serverEmptySlots;
  if (liveCloudVersion === lastPublicSlotsVersion) return cachedPublicSlots;
  lastPublicSlotsVersion = liveCloudVersion;
  cachedPublicSlots = [...liveCloudBookedSlots];
  return cachedPublicSlots;
}
const serverEmptySlots: PublicBookedSlot[] = [];
function getServerPublicBookedSlotsSnapshot() {
  return serverEmptySlots;
}

/** Reactive anonymized booked slots (merges reception localStorage + live Cloudflare slot locks) */
export function useBookedSlots(doctorId: string, date: string): string[] {
  const appointments = useAppointments();
  const cloudSlots = useSyncExternalStore(
    (cb) => subscribeEvents(["ep:appointments_updated"], cb, true),
    getPublicBookedSlotsSnapshot,
    getServerPublicBookedSlotsSnapshot,
  );

  if (!doctorId || !date) return [];
  const local = appointments
    .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "cancelled")
    .map((a) => a.time);
  const remote = cloudSlots
    .filter((s) => s.doctorId === doctorId && s.date === date)
    .map((s) => s.time);
  return Array.from(new Set([...local, ...remote]));
}

let cachedDoctorStatuses: Record<string, DoctorLiveStatus> = {};
let lastRawDoctorStatuses = "";
function getDoctorStatusesSnapshot(): Record<string, DoctorLiveStatus> {
  if (typeof window === "undefined") return serverEmptyObj;
  const sig = `${window.localStorage.getItem(STORAGE_KEYS.DOCTOR_STATUS) || ""}|v${liveCloudVersion}|${clinicClock(new Date()).dateKey}`;
  if (sig === lastRawDoctorStatuses) return cachedDoctorStatuses;
  lastRawDoctorStatuses = sig;
  cachedDoctorStatuses = getAllDoctorStatuses();
  return cachedDoctorStatuses;
}
const serverEmptyObj: Record<string, DoctorLiveStatus> = {};
function getServerDoctorStatusesSnapshot() {
  return serverEmptyObj;
}

export function useDoctorStatuses(): Record<string, DoctorLiveStatus> {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:doctor_status_updated"], cb, true),
    getDoctorStatusesSnapshot,
    getServerDoctorStatusesSnapshot,
  );
}

let cachedActiveDoctors: Doctor[] = defaultDoctors;
let lastDoctorSignal = "";
function getActiveDoctorsSnapshot(): Doctor[] {
  if (typeof window === "undefined") return defaultDoctors;
  const sig = `${window.localStorage.getItem(STORAGE_KEYS.DOCTOR_OVERRIDES) || ""}|${window.localStorage.getItem(STORAGE_KEYS.CUSTOM_DOCTORS) || ""}|v${liveCloudVersion}`;
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
    (cb) => subscribeEvents(["ep:doctors_updated"], cb, true),
    getActiveDoctorsSnapshot,
    getServerActiveDoctorsSnapshot,
  );
}

const serverCloudStatus: CloudConnectionState = {
  checked: false,
  configured: false,
  authenticated: false,
  storageDriver: "none",
  usingDefaultPin: false,
  whatsappChannel: "unconfigured",
  lastSyncedAt: null,
};

export function useCloudSyncStatus(): CloudConnectionState {
  return useSyncExternalStore(
    (cb) => subscribeEvents(["ep:cloud_status_updated", "ep:sync_complete"], cb, false),
    () => cloudStatusSnapshot,
    () => serverCloudStatus,
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
    (cb) => subscribeEvents(["ep:appointments_updated"], cb, false),
    getLastReceiptSnapshot,
    getServerLastReceiptSnapshot,
  );
}
