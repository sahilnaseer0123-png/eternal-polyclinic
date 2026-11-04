// Shared storage, authentication, and conflict-free state engine for Cloudflare Pages Functions.
// Supports BOTH Cloudflare D1 (`EP_DB`) and Cloudflare Workers KV (`EP_KV`) out of the box with zero external npm dependencies.

import { doctors as defaultDoctors, type Doctor } from "../../data/clinic";
import { mergeActiveDoctors, sanitizeOpd } from "../../lib/doctor-overrides";
import type { SqlDatabase } from "./db";
import type {
  Appointment,
  AppointmentStatus,
  DoctorLiveStatus,
  DoctorOverride,
} from "../../lib/appointments";

// ---------------------------------------------------------------------------
// Minimal Cloudflare Runtime Interfaces (compatible with strict Next.js TS)
// ---------------------------------------------------------------------------

export interface CfKVNamespace {
  get(key: string): Promise<string | null>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  put(key: string, value: string | ArrayBuffer, options?: { metadata?: Record<string, unknown> }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CfD1PreparedStatement {
  bind(...values: unknown[]): CfD1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface CfD1Database {
  prepare(query: string): CfD1PreparedStatement;
}

export interface CloudEnv {
  EP_DB?: CfD1Database;
  EP_KV?: CfKVNamespace;
  /** Clinic records database (patients, lab reports, staff, notifications). See functions/_lib/db.ts. */
  EP_SQL?: SqlDatabase;
  /** Days a patient's secure report link stays valid (default 30). */
  REPORT_LINK_DAYS?: string;
  ADMIN_PIN?: string;
  SESSION_SECRET?: string;
  // Optional instant outbound WhatsApp Business API credentials
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  /** Meta template names (approved in WhatsApp Manager). See docs/whatsapp-setup.md. */
  WHATSAPP_TEMPLATE_APPOINTMENT?: string;
  WHATSAPP_TEMPLATE_LAB_REPORT?: string;
  WHATSAPP_TEMPLATE_LANG?: string;
  /** Meta webhook: verify token you choose, and the app secret used to sign delivery updates. */
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_APP_SECRET?: string;
  /** Twilio Content API template SIDs (needed for business-initiated messages on Twilio). */
  TWILIO_CONTENT_SID_APPOINTMENT?: string;
  TWILIO_CONTENT_SID_LAB_REPORT?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_WHATSAPP_FROM?: string;
  WHATSAPP_WEBHOOK_URL?: string;
  WHATSAPP_WEBHOOK_SECRET?: string;
}

export interface CfPagesContext {
  request: Request;
  env: CloudEnv;
  params?: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
}

// ---------------------------------------------------------------------------
// Storage Adapter (D1 SQLite or Workers KV)
// ---------------------------------------------------------------------------

export type StorageDriverName = "d1" | "kv" | "none";

export interface KeyValueDriver {
  kind: StorageDriverName;
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

const d1Initialized = new WeakSet<CfD1Database>();

async function ensureD1Table(db: CfD1Database): Promise<void> {
  if (d1Initialized.has(db)) return;
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS clinic_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)",
    )
    .run();
  d1Initialized.add(db);
}

export function resolveStorageDriver(env: CloudEnv): KeyValueDriver | null {
  if (env.EP_DB) {
    const db = env.EP_DB;
    return {
      kind: "d1",
      async get(key: string) {
        await ensureD1Table(db);
        const row = await db
          .prepare("SELECT value FROM clinic_kv WHERE key = ?1")
          .bind(key)
          .first<{ value: string }>();
        return row?.value ?? null;
      },
      async put(key: string, value: string) {
        await ensureD1Table(db);
        await db
          .prepare(
            "INSERT INTO clinic_kv (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
          )
          .bind(key, value, Date.now())
          .run();
      },
    };
  }

  if (env.EP_KV) {
    const kv = env.EP_KV;
    return {
      kind: "kv",
      get: (key) => kv.get(key),
      put: (key, value) => kv.put(key, value),
    };
  }

  return null;
}

/** In-memory KV mock for unit tests (strings and binary values, like Workers KV). */
export function createMemoryKV(): CfKVNamespace {
  const map = new Map<string, string | ArrayBuffer>();
  async function get(key: string): Promise<string | null>;
  async function get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  async function get(key: string, type?: "arrayBuffer"): Promise<string | ArrayBuffer | null> {
    const v = map.get(key);
    if (v === undefined) return null;
    if (type === "arrayBuffer") return typeof v === "string" ? (new TextEncoder().encode(v).buffer as ArrayBuffer) : v.slice(0);
    return typeof v === "string" ? v : new TextDecoder().decode(v);
  }
  return {
    get,
    async put(key: string, value: string | ArrayBuffer) {
      map.set(key, typeof value === "string" ? value : value.slice(0));
    },
    async delete(key: string) {
      map.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// Clinic Time Helper (Asia/Kolkata YYYY-MM-DD)
// ---------------------------------------------------------------------------

export function clinicTodayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// ---------------------------------------------------------------------------
// JSON Response Helpers
// ---------------------------------------------------------------------------

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      ...extraHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Cryptographic PIN Hashing & Signed Session Cookies (Web Crypto API)
// ---------------------------------------------------------------------------

const AUTH_PIN_KEY = "ep:auth_pin_v1";
const AUTH_SECRET_KEY = "ep:auth_secret_v1";
const STATE_KEY = "ep:clinic_state_v1";
const SESSION_COOKIE_NAME = "ep_admin_session";
const SESSION_TTL_SECONDS = 14 * 60 * 60; // 14 hours (covers full 7am-8pm clinic day)
const BOOTSTRAP_DEFAULT_PIN = "1234";

type StoredPinRecord = {
  saltHex: string;
  hashHex: string;
  updatedAt: number;
};

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(new Uint8Array(digest));
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return toHex(new Uint8Array(sig));
}

/** Constant-time string comparison to prevent timing side-channels */
export function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

export async function getSigningSecret(driver: KeyValueDriver, env: CloudEnv): Promise<string> {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) {
    return env.SESSION_SECRET;
  }
  const existing = await driver.get(AUTH_SECRET_KEY);
  if (existing && existing.length >= 32) return existing;
  const created = randomHex(32);
  await driver.put(AUTH_SECRET_KEY, created);
  return created;
}

export async function isUsingDefaultPin(driver: KeyValueDriver, env: CloudEnv): Promise<boolean> {
  const storedRaw = await driver.get(AUTH_PIN_KEY);
  if (storedRaw) return false;
  if (env.ADMIN_PIN && env.ADMIN_PIN.trim().length >= 4) return false;
  return true;
}

export async function verifyAdminPin(
  candidatePin: string,
  driver: KeyValueDriver,
  env: CloudEnv,
): Promise<boolean> {
  const clean = candidatePin.trim();
  if (!clean) return false;

  // 1. Custom PIN saved from /admin takes top priority so staff can rotate it anytime
  const storedRaw = await driver.get(AUTH_PIN_KEY);
  if (storedRaw) {
    try {
      const record = JSON.parse(storedRaw) as StoredPinRecord;
      const candidateHash = await sha256Hex(`${record.saltHex}:${clean}`);
      return constantTimeEqual(candidateHash, record.hashHex);
    } catch {
      return false;
    }
  }

  // 2. Otherwise check Cloudflare Pages secret environment variable ADMIN_PIN
  if (env.ADMIN_PIN && env.ADMIN_PIN.trim().length > 0) {
    const expectedHash = await sha256Hex(`env:${env.ADMIN_PIN.trim()}`);
    const actualHash = await sha256Hex(`env:${clean}`);
    return constantTimeEqual(actualHash, expectedHash);
  }

  // 3. Initial first-boot PIN before staff sets a custom PIN or ADMIN_PIN secret
  const expectedHash = await sha256Hex(`boot:${BOOTSTRAP_DEFAULT_PIN}`);
  const actualHash = await sha256Hex(`boot:${clean}`);
  return constantTimeEqual(actualHash, expectedHash);
}

export async function saveAdminPin(newPin: string, driver: KeyValueDriver): Promise<void> {
  const saltHex = randomHex(16);
  const hashHex = await sha256Hex(`${saltHex}:${newPin.trim()}`);
  const record: StoredPinRecord = { saltHex, hashHex, updatedAt: Date.now() };
  await driver.put(AUTH_PIN_KEY, JSON.stringify(record));
  // Rotate signing secret so old sessions must re-authenticate with the new PIN
  await driver.put(AUTH_SECRET_KEY, randomHex(32));
}

export async function createSessionCookie(
  driver: KeyValueDriver,
  env: CloudEnv,
  isHttps: boolean,
): Promise<string> {
  const secret = await getSigningSecret(driver, env);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const nonce = randomHex(12);
  const payload = `${expiresAt}.${nonce}`;
  const signature = await hmacSha256Hex(secret, payload);
  const token = `${payload}.${signature}`;
  const secureAttr = isHttps ? " Secure;" : "";
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly;${secureAttr} SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(isHttps: boolean): string {
  const secureAttr = isHttps ? " Secure;" : "";
  return `${SESSION_COOKIE_NAME}=; HttpOnly;${secureAttr} SameSite=Strict; Path=/; Max-Age=0`;
}

export function parseCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export async function verifyRequestSession(
  request: Request,
  driver: KeyValueDriver,
  env: CloudEnv,
): Promise<boolean> {
  const rawToken = parseCookie(request.headers.get("Cookie"), SESSION_COOKIE_NAME);
  if (!rawToken) return false;
  const segments = rawToken.split(".");
  if (segments.length !== 3) return false;
  const [expStr, nonce, sig] = segments;
  const expiresAt = Number(expStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }
  const secret = await getSigningSecret(driver, env);
  const expectedSig = await hmacSha256Hex(secret, `${expStr}.${nonce}`);
  return constantTimeEqual(sig, expectedSig);
}

// ---------------------------------------------------------------------------
// Clinic Cloud State & Conflict-Free Mutations
// ---------------------------------------------------------------------------

export type CloudClinicState = {
  updatedAt: number;
  appointments: Appointment[];
  deletedTokens: Record<string, number>; // token -> deletedAt timestamp
  doctorStatuses: Record<string, DoctorLiveStatus & { date?: string }>;
  overrides: Record<string, DoctorOverride>;
  customDoctors: Doctor[];
};

export type PublicBookedSlot = {
  doctorId: string;
  date: string;
  time: string;
};

export type PublicLivePayload = {
  configured: boolean;
  updatedAt: number;
  doctorStatuses: Record<string, DoctorLiveStatus & { date?: string }>;
  overrides: Record<string, DoctorOverride>;
  customDoctors: Doctor[];
  bookedSlots: PublicBookedSlot[];
};

export type CloudMutation =
  | { op: "upsert_appointment"; appointment: Appointment }
  | { op: "update_appointment_status"; token: string; status: AppointmentStatus }
  | { op: "delete_appointment"; token: string }
  | { op: "set_doctor_status"; doctorId: string; status: DoctorLiveStatus & { date?: string } }
  | { op: "set_doctor_override"; doctorId: string; override: Partial<DoctorOverride> }
  | { op: "save_custom_doctor"; doctor: Doctor }
  | { op: "remove_custom_doctor"; doctorId: string }
  | {
      op: "sync_merge";
      appointments?: Appointment[];
      doctorStatuses?: Record<string, DoctorLiveStatus & { date?: string }>;
      overrides?: Record<string, DoctorOverride>;
      customDoctors?: Doctor[];
    };

function emptyClinicState(): CloudClinicState {
  return {
    updatedAt: 0,
    appointments: [],
    deletedTokens: {},
    doctorStatuses: {},
    overrides: {},
    customDoctors: [],
  };
}

/** Filters out stale live delay/in-clinic statuses from past clinic days */
export function pruneStaleDoctorStatuses(
  statuses: Record<string, DoctorLiveStatus & { date?: string }>,
  todayKey: string = clinicTodayKey(),
): Record<string, DoctorLiveStatus & { date?: string }> {
  const active: Record<string, DoctorLiveStatus & { date?: string }> = {};
  for (const [docId, st] of Object.entries(statuses || {})) {
    if (!st) continue;
    if (st.date && st.date !== todayKey) continue;
    if (st.state === "scheduled" && !st.note) continue;
    active[docId] = st;
  }
  return active;
}

export async function readClinicState(
  driver: KeyValueDriver,
  now: Date = new Date(),
): Promise<CloudClinicState> {
  const raw = await driver.get(STATE_KEY);
  if (!raw) return emptyClinicState();
  try {
    const parsed = JSON.parse(raw) as Partial<CloudClinicState>;
    const todayKey = clinicTodayKey(now);
    return {
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
      appointments: Array.isArray(parsed.appointments) ? parsed.appointments : [],
      deletedTokens: parsed.deletedTokens && typeof parsed.deletedTokens === "object" ? parsed.deletedTokens : {},
      doctorStatuses: pruneStaleDoctorStatuses(parsed.doctorStatuses ?? {}, todayKey),
      overrides: parsed.overrides && typeof parsed.overrides === "object" ? parsed.overrides : {},
      customDoctors: Array.isArray(parsed.customDoctors) ? parsed.customDoctors : [],
    };
  } catch {
    return emptyClinicState();
  }
}

async function writeClinicState(driver: KeyValueDriver, state: CloudClinicState): Promise<CloudClinicState> {
  // Keep deleted token tombstones bounded to the 500 most recent entries
  const tombstoneEntries = Object.entries(state.deletedTokens);
  if (tombstoneEntries.length > 500) {
    tombstoneEntries.sort((a, b) => b[1] - a[1]);
    state.deletedTokens = Object.fromEntries(tombstoneEntries.slice(0, 500));
  }
  state.updatedAt = Date.now();
  await driver.put(STATE_KEY, JSON.stringify(state));
  return state;
}

export async function applyCloudMutation(
  driver: KeyValueDriver,
  mutation: CloudMutation,
  now: Date = new Date(),
): Promise<CloudClinicState> {
  const state = await readClinicState(driver, now);
  const todayKey = clinicTodayKey(now);

  switch (mutation.op) {
    case "upsert_appointment": {
      const apt = mutation.appointment;
      if (apt && typeof apt.token === "string" && apt.token.trim()) {
        delete state.deletedTokens[apt.token];
        state.appointments = [apt, ...state.appointments.filter((a) => a.token !== apt.token)];
      }
      break;
    }

    case "update_appointment_status": {
      state.appointments = state.appointments.map((a) =>
        a.token === mutation.token ? { ...a, status: mutation.status } : a,
      );
      break;
    }

    case "delete_appointment": {
      state.deletedTokens[mutation.token] = Date.now();
      state.appointments = state.appointments.filter((a) => a.token !== mutation.token);
      break;
    }

    case "set_doctor_status": {
      const stamped = {
        ...mutation.status,
        date: mutation.status.date ?? todayKey,
        updatedAt: Date.now(),
      };
      if (stamped.state === "scheduled" && !stamped.note) {
        delete state.doctorStatuses[mutation.doctorId];
      } else {
        state.doctorStatuses[mutation.doctorId] = stamped;
      }
      break;
    }

    case "set_doctor_override": {
      // Only this doctor's entry changes; other doctors and every appointment are left alone.
      const prev = state.overrides[mutation.doctorId] ?? {};
      const nextOv: DoctorOverride = { ...prev, ...mutation.override, updatedAt: Date.now() };
      if ("customOpd" in mutation.override) {
        // null = back to the built-in schedule; an array replaces the old days entirely (no duplicates)
        nextOv.customOpd = mutation.override.customOpd === null ? null : sanitizeOpd(mutation.override.customOpd);
      }
      for (const k of ["leaveFrom", "leaveUntil"] as const) {
        if (k in mutation.override && !mutation.override[k]) nextOv[k] = null;
      }
      state.overrides[mutation.doctorId] = nextOv;
      break;
    }

    case "save_custom_doctor": {
      const doc = mutation.doctor;
      if (doc && typeof doc.id === "string" && doc.id.trim()) {
        state.customDoctors = [doc, ...state.customDoctors.filter((d) => d.id !== doc.id)];
      }
      break;
    }

    case "remove_custom_doctor": {
      state.customDoctors = state.customDoctors.filter((d) => d.id !== mutation.doctorId);
      break;
    }

    case "sync_merge": {
      // Merge appointments without resurrecting deleted tokens
      if (Array.isArray(mutation.appointments)) {
        const byToken = new Map<string, Appointment>();
        for (const existing of state.appointments) {
          byToken.set(existing.token, existing);
        }
        for (const incoming of mutation.appointments) {
          if (!incoming?.token) continue;
          const deletedAt = state.deletedTokens[incoming.token];
          if (deletedAt && deletedAt >= (incoming.createdAt || 0)) continue;
          if (!byToken.has(incoming.token)) {
            byToken.set(incoming.token, incoming);
          }
        }
        state.appointments = Array.from(byToken.values()).sort((a, b) => b.createdAt - a.createdAt);
      }

      // Merge doctor statuses by updatedAt for today only
      if (mutation.doctorStatuses && typeof mutation.doctorStatuses === "object") {
        for (const [docId, inc] of Object.entries(mutation.doctorStatuses)) {
          if (!inc) continue;
          if (inc.date && inc.date !== todayKey) continue;
          const cur = state.doctorStatuses[docId];
          if (!cur || (inc.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
            if (inc.state === "scheduled" && !inc.note) {
              delete state.doctorStatuses[docId];
            } else {
              state.doctorStatuses[docId] = { ...inc, date: inc.date ?? todayKey };
            }
          }
        }
      }

      if (mutation.overrides && typeof mutation.overrides === "object") {
        state.overrides = { ...state.overrides, ...mutation.overrides };
      }

      if (Array.isArray(mutation.customDoctors) && mutation.customDoctors.length > 0) {
        const byId = new Map<string, Doctor>();
        for (const d of state.customDoctors) byId.set(d.id, d);
        for (const d of mutation.customDoctors) {
          if (d?.id && !byId.has(d.id)) byId.set(d.id, d);
        }
        state.customDoctors = Array.from(byId.values());
      }
      break;
    }
  }

  return writeClinicState(driver, state);
}

/** Resolves the live list of active doctors on the server (same rule as the browser: lib/doctor-overrides.ts) */
export function buildActiveDoctorsFromState(state: CloudClinicState, now: Date = new Date()): Doctor[] {
  return mergeActiveDoctors(defaultDoctors, state.overrides, state.customDoctors, clinicTodayKey(now));
}

/** Builds a strictly anonymized public payload (ZERO patient names, phone numbers, addresses, or tokens) */
export function buildPublicLivePayload(
  state: CloudClinicState,
  now: Date = new Date(),
): PublicLivePayload {
  const todayKey = clinicTodayKey(now);
  const bookedSlots: PublicBookedSlot[] = state.appointments
    .filter((a) => a.date >= todayKey && a.status !== "cancelled")
    .map((a) => ({
      doctorId: a.doctorId,
      date: a.date,
      time: a.time,
    }));

  return {
    configured: true,
    updatedAt: state.updatedAt,
    doctorStatuses: pruneStaleDoctorStatuses(state.doctorStatuses, todayKey),
    overrides: state.overrides,
    customDoctors: state.customDoctors,
    bookedSlots,
  };
}
