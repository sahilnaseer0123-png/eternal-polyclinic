// One record per patient, across reception, online booking and the lab.
//
// Matching rule: same 10-digit mobile AND same name (case, spacing, punctuation and Mr/Mrs/Dr ignored).
// Matching on phone alone would merge family members, who often share one mobile in Sopore.
// Patient IDs look like EPP-00042 and never change.

import type { Appointment } from "../../lib/appointments";
import { audit, clinicDateKey, ensureSchema, type SqlDatabase } from "./db";

export type PatientRow = {
  id: number;
  code: string;
  name: string;
  phone: string;
  phone_verified: number;
  area: string | null;
  source: string;
  created_at: number;
  created_date: string;
  updated_at: number;
};

export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/^(mr|mrs|ms|miss|dr|master|baby)\.?\s+/i, "")
    .replace(/[^a-z؀-ۿऀ-ॿ]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function cleanPhone(raw: string): string | null {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function patientCode(id: number): string {
  return `EPP-${String(id).padStart(5, "0")}`;
}

export function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 2)}xxxxx${phone.slice(7)}` : phone;
}

export type PatientInput = {
  name: string;
  phone: string;
  area?: string | null;
  /** Staff saw the patient and confirmed the number (reception desk, lab counter). */
  verified?: boolean;
  source: "reception" | "online" | "lab" | "register";
  createdAt?: number;
};

/**
 * Finds the patient by mobile + name or creates them. Safe to call twice at once:
 * the UNIQUE(phone, name_key) constraint makes the second call land on the same row.
 * Never downgrades a verified mobile to unverified.
 */
export async function findOrCreatePatient(
  db: SqlDatabase,
  input: PatientInput,
): Promise<{ patient: PatientRow; created: boolean }> {
  await ensureSchema(db);
  const phone = cleanPhone(input.phone);
  if (!phone) throw new Error("Enter a valid 10-digit mobile number.");
  const name = input.name.trim().replace(/\s+/g, " ");
  const key = nameKey(name);
  if (!key) throw new Error("Enter the patient's name.");
  const at = input.createdAt ?? Date.now();

  const existing = await db
    .prepare("SELECT * FROM patients WHERE phone = ?1 AND name_key = ?2")
    .bind(phone, key)
    .first<PatientRow>();
  if (existing) {
    const verified = input.verified ? 1 : existing.phone_verified;
    const area = existing.area || input.area?.trim() || null;
    if (verified !== existing.phone_verified || area !== existing.area) {
      await db
        .prepare("UPDATE patients SET phone_verified = ?1, area = ?2, updated_at = ?3 WHERE id = ?4")
        .bind(verified, area, Date.now(), existing.id)
        .run();
    }
    return { patient: { ...existing, phone_verified: verified, area }, created: false };
  }

  const inserted = await db
    .prepare(
      `INSERT INTO patients (name, name_key, phone, phone_verified, area, source, created_at, created_date, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
       ON CONFLICT (phone, name_key) DO NOTHING
       RETURNING id`,
    )
    .bind(name, key, phone, input.verified ? 1 : 0, input.area?.trim() || null, input.source, at, clinicDateKey(at), Date.now())
    .first<{ id: number }>();

  if (!inserted) {
    // Someone else created the same patient a moment ago: use theirs.
    const again = await db.prepare("SELECT * FROM patients WHERE phone = ?1 AND name_key = ?2").bind(phone, key).first<PatientRow>();
    if (!again) throw new Error("Could not save the patient. Please try again.");
    return { patient: again, created: false };
  }
  const code = patientCode(inserted.id);
  await db.prepare("UPDATE patients SET code = ?1 WHERE id = ?2").bind(code, inserted.id).run();
  const patient = await db.prepare("SELECT * FROM patients WHERE id = ?1").bind(inserted.id).first<PatientRow>();
  return { patient: patient!, created: true };
}

/**
 * Mirrors one OPD-register appointment into the database, linked to its patient.
 * The KV register stays the source for the live OPD screen; this copy feeds patient history and statistics.
 * Updates status only; it never moves the date or time of an existing record.
 */
export async function upsertAppointmentRecord(
  db: SqlDatabase,
  apt: Appointment,
): Promise<{ patient: PatientRow; created: boolean } | null> {
  if (!apt?.token || !cleanPhone(apt.patientPhone) || !nameKey(apt.patientName ?? "")) return null;
  const { patient, created } = await findOrCreatePatient(db, {
    name: apt.patientName,
    phone: apt.patientPhone,
    area: apt.patientAddress,
    verified: apt.type === "walk_in",
    source: apt.type === "walk_in" ? "reception" : "online",
    createdAt: apt.createdAt || Date.now(),
  });
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO appointments (token, patient_id, doctor_id, doctor_name, date, time, type, status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
       ON CONFLICT (token) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, deleted_at = NULL`,
    )
    .bind(apt.token, patient.id, apt.doctorId, apt.doctorName, apt.date, apt.time || null, apt.type, apt.status, apt.createdAt || now, now)
    .run();
  return { patient, created };
}

export async function setAppointmentRecordStatus(db: SqlDatabase, token: string, status: string): Promise<void> {
  await ensureSchema(db);
  await db.prepare("UPDATE appointments SET status = ?1, updated_at = ?2 WHERE token = ?3").bind(status, Date.now(), token).run();
}

/** Deleted from the OPD screen: kept in history, marked deleted. */
export async function markAppointmentRecordDeleted(db: SqlDatabase, token: string): Promise<void> {
  await ensureSchema(db);
  await db.prepare("UPDATE appointments SET deleted_at = ?1, updated_at = ?1 WHERE token = ?2").bind(Date.now(), token).run();
}

/** One-time copy of every appointment already in the KV register (runs once; safe to repeat). */
export async function backfillFromRegister(db: SqlDatabase, appointments: Appointment[], force = false): Promise<number> {
  await ensureSchema(db);
  if (!force) {
    const done = await db.prepare("SELECT value FROM meta WHERE key = 'backfill_v1'").first<{ value: string }>();
    if (done) return 0;
  }
  let n = 0;
  const sorted = [...appointments].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  for (const apt of sorted) {
    try {
      const existing = await db.prepare("SELECT token FROM appointments WHERE token = ?1").bind(apt.token).first();
      if (existing) continue;
      if (await upsertAppointmentRecord(db, apt)) n += 1;
    } catch {
      // A malformed old record must not stop the import
    }
  }
  await db
    .prepare("INSERT INTO meta (key, value) VALUES ('backfill_v1', ?1) ON CONFLICT (key) DO UPDATE SET value = excluded.value")
    .bind(String(Date.now()))
    .run();
  if (n > 0) await audit(db, null, "patients.backfill", undefined, `${n} appointments imported from the OPD register`);
  return n;
}

export function publicPatient(p: PatientRow) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    phone: p.phone,
    phoneVerified: p.phone_verified === 1,
    area: p.area,
    source: p.source,
    createdAt: p.created_at,
    createdDate: p.created_date,
  };
}
