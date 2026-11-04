// GET   /api/staff/patients/:id   patient profile: details, appointment history, lab reports, messages, activity
// PATCH /api/staff/patients/:id   { name?, phone?, area?, phoneVerified? }  (owner, reception)
//       Changing the mobile number clears "verified" unless staff confirm the new number in the same save.

import { jsonResponse, type CfPagesContext } from "../../../_lib/clinic-store";
import { audit } from "../../../_lib/db";
import { bad, param, readJson, staffGate } from "../../../_lib/http";
import { cleanPhone, nameKey, publicPatient, type PatientRow } from "../../../_lib/patients";

async function load(context: CfPagesContext, roles: ("owner" | "reception" | "lab")[]) {
  const gate = await staffGate(context, roles);
  if (gate instanceof Response) return gate;
  const id = Number(param(context, "id"));
  if (!Number.isInteger(id) || id <= 0) return bad("Unknown patient.", 404);
  const patient = await gate.db.prepare("SELECT * FROM patients WHERE id = ?1").bind(id).first<PatientRow>();
  if (!patient) return bad("Patient not found.", 404);
  return { ...gate, patient };
}

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const res = await load(context, ["owner", "reception", "lab"]);
  if (res instanceof Response) return res;
  const { db, patient, staff } = res;

  const reports = await db
    .prepare(
      `SELECT id, test_name, sample_date, status, delivery_status, file_name, uploaded_at, ready_at, last_sent_at, delivered_at, created_at
       FROM lab_reports WHERE patient_id = ?1 ORDER BY created_at DESC`,
    )
    .bind(patient.id)
    .all();

  if (staff.role === "lab") {
    // Lab staff see who the patient is and their reports, not their consultation history.
    return jsonResponse({ ok: true, patient: publicPatient(patient), appointments: [], reports: reports.results, notifications: [] });
  }

  const appointments = await db
    .prepare(
      `SELECT token, doctor_id, doctor_name, date, time, type, status, created_at, deleted_at
       FROM appointments WHERE patient_id = ?1 ORDER BY date DESC, time DESC`,
    )
    .bind(patient.id)
    .all();
  const notifications = await db
    .prepare(
      `SELECT id, kind, ref_id, status, attempt, trigger, error, created_at, sent_at, delivered_at, read_at, failed_at
       FROM notifications WHERE patient_id = ?1 ORDER BY id DESC LIMIT 50`,
    )
    .bind(patient.id)
    .all();

  return jsonResponse({
    ok: true,
    patient: publicPatient(patient),
    appointments: appointments.results,
    reports: reports.results,
    notifications: notifications.results,
  });
}

export async function onRequestPatch(context: CfPagesContext): Promise<Response> {
  const res = await load(context, ["owner", "reception"]);
  if (res instanceof Response) return res;
  const { db, patient, staff } = res;
  const body = await readJson<{ name?: string; phone?: string; area?: string | null; phoneVerified?: boolean }>(context.request);
  if (!body) return bad("Invalid request.");

  const name = body.name !== undefined ? body.name.trim().replace(/\s+/g, " ") : patient.name;
  if (!nameKey(name)) return bad("Enter the patient's name.");
  let phone = patient.phone;
  let verified = patient.phone_verified;
  if (body.phone !== undefined) {
    const p = cleanPhone(body.phone);
    if (!p) return bad("Enter a valid 10-digit mobile number.");
    if (p !== patient.phone) verified = 0;
    phone = p;
  }
  if (body.phoneVerified !== undefined) verified = body.phoneVerified ? 1 : 0;
  const area = body.area !== undefined ? body.area?.trim() || null : patient.area;

  const clash = await db
    .prepare("SELECT id, code FROM patients WHERE phone = ?1 AND name_key = ?2 AND id != ?3")
    .bind(phone, nameKey(name), patient.id)
    .first<{ id: number; code: string }>();
  if (clash) return bad(`Another record (${clash.code}) already has this name and mobile number.`, 409);

  await db
    .prepare("UPDATE patients SET name = ?1, name_key = ?2, phone = ?3, phone_verified = ?4, area = ?5, updated_at = ?6 WHERE id = ?7")
    .bind(name, nameKey(name), phone, verified, area, Date.now(), patient.id)
    .run();
  const changed = [
    name !== patient.name ? "name" : null,
    phone !== patient.phone ? "mobile" : null,
    verified !== patient.phone_verified ? (verified ? "mobile verified" : "mobile unverified") : null,
    area !== patient.area ? "area" : null,
  ].filter(Boolean);
  await audit(db, staff.id, "patient.update", `patient:${patient.id}`, changed.join(", ") || "no change");
  const updated = await db.prepare("SELECT * FROM patients WHERE id = ?1").bind(patient.id).first<PatientRow>();
  return jsonResponse({ ok: true, patient: publicPatient(updated!) });
}
