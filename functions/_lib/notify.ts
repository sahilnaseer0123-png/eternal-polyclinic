// Notification log + sending rules shared by every WhatsApp the system sends.
//
// - Every message is a row in `notifications` with a unique idempotency key, so an automatic message is
//   sent at most once even if two requests race (appointment: "appt:<token>", lab report: "lab-auto:<id>").
// - Manual resends get their own key and row; retries reuse the failed row and bump `attempt`.
// - Every state change is written to `notification_events` (complete delivery history).
// - Provider delivery updates (webhooks) move the row to delivered / read / failed and roll the
//   result up to the lab report's delivery status.

import { clinic } from "../../data/clinic";
import type { Appointment } from "../../lib/appointments";
import { hmacSha256Hex, randomHex, sha256Hex, type CloudEnv } from "./clinic-store";
import { audit, changes, clinicDateKey, ensureSchema, type SqlDatabase } from "./db";
import { maskPhone, upsertAppointmentRecord, type PatientRow } from "./patients";
import {
  NOT_CONFIGURED_ERROR,
  getConfiguredWhatsAppChannel,
  sendAppointmentConfirmation,
  sendBookingConfirmationWhatsApp,
  sendLabReport,
  type WhatsAppDispatchResult,
} from "./whatsapp";

export type NotificationKind = "appointment_confirmation" | "lab_report" | "owner_summary";
export type NotificationStatus = "queued" | "sent" | "delivered" | "read" | "failed";

export type NotificationRow = {
  id: number;
  kind: NotificationKind;
  ref_id: string;
  patient_id: number | null;
  to_phone: string;
  channel: string;
  status: NotificationStatus;
  idempotency_key: string;
  attempt: number;
  trigger: string;
  provider_message_id: string | null;
  error: string | null;
  created_by: number | null;
  created_at: number;
  updated_at: number;
  sent_at: number | null;
  delivered_at: number | null;
  read_at: number | null;
  failed_at: number | null;
};

async function event(db: SqlDatabase, id: number, status: string, detail?: string | null): Promise<void> {
  await db
    .prepare("INSERT INTO notification_events (notification_id, status, detail, at) VALUES (?1, ?2, ?3, ?4)")
    .bind(id, status, detail ?? null, Date.now())
    .run();
}

/** Claims an idempotency key. Returns the new row id, or null when that message was already created. */
async function claim(
  db: SqlDatabase,
  env: CloudEnv,
  n: { kind: NotificationKind; refId: string; patientId: number | null; phone: string; key: string; trigger: "auto" | "manual"; createdBy: number | null },
): Promise<number | null> {
  const now = Date.now();
  const row = await db
    .prepare(
      `INSERT INTO notifications (kind, ref_id, patient_id, to_phone, channel, status, idempotency_key, trigger, created_by, created_at, created_date, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'queued', ?6, ?7, ?8, ?9, ?10, ?9)
       ON CONFLICT (idempotency_key) DO NOTHING
       RETURNING id`,
    )
    .bind(n.kind, n.refId, n.patientId, n.phone, getConfiguredWhatsAppChannel(env), n.key, n.trigger, n.createdBy, now, clinicDateKey(now))
    .first<{ id: number }>();
  if (!row) return null;
  await event(db, row.id, "queued", n.trigger === "manual" ? "Sent by staff" : "Automatic");
  return row.id;
}

async function record(db: SqlDatabase, id: number, res: WhatsAppDispatchResult): Promise<NotificationStatus> {
  const now = Date.now();
  if (res.sent) {
    await db
      .prepare(
        `UPDATE notifications SET status = 'sent', channel = ?1, provider_message_id = ?2, error = NULL, sent_at = ?3, updated_at = ?3
         WHERE id = ?4 AND status IN ('queued','failed')`,
      )
      .bind(res.channel, res.providerMessageId ?? null, now, id)
      .run();
    await event(db, id, "sent", res.providerMessageId ? `Provider id ${res.providerMessageId}` : res.channel);
    return "sent";
  }
  const err = res.error ?? "Unknown error";
  await db
    .prepare("UPDATE notifications SET status = 'failed', channel = ?1, error = ?2, failed_at = ?3, updated_at = ?3 WHERE id = ?4")
    .bind(res.channel, err, now, id)
    .run();
  await event(db, id, "failed", err);
  return "failed";
}

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------

/**
 * Called after an appointment is saved (online booking, reception walk-in, offline tablet sync).
 * Links it to the patient record and sends the confirmation once. Without the database it falls back
 * to the old direct send, so online booking keeps working either way.
 */
export async function afterAppointmentSaved(
  env: CloudEnv,
  apt: Appointment,
  createdBy: number | null = null,
): Promise<{ sent: boolean; channel: string; duplicate?: boolean; error?: string; patientCode?: string }> {
  const db = env.EP_SQL;
  if (!db) {
    if (apt.whatsappSent) return { sent: true, channel: "cached", duplicate: true };
    const r = await sendBookingConfirmationWhatsApp(apt, env);
    return { sent: r.sent, channel: r.channel, error: r.error };
  }
  await ensureSchema(db);
  const linked = await upsertAppointmentRecord(db, apt);
  if (!linked) return { sent: false, channel: "none", error: "Appointment has no valid name or mobile" };
  if (apt.status === "cancelled") return { sent: false, channel: "none", patientCode: linked.patient.code };
  // Old or past appointments (imports, offline tablets catching up) are recorded but never messaged.
  const fresh = apt.date >= clinicDateKey() && Date.now() - (apt.createdAt || 0) < 24 * 60 * 60 * 1000;
  if (!fresh) return { sent: Boolean(apt.whatsappSent), channel: "none", patientCode: linked.patient.code };

  const id = await claim(db, env, {
    kind: "appointment_confirmation",
    refId: apt.token,
    patientId: linked.patient.id,
    phone: linked.patient.phone,
    key: `appt:${apt.token}`,
    trigger: "auto",
    createdBy,
  });
  if (id === null) {
    const existing = await db
      .prepare("SELECT status FROM notifications WHERE idempotency_key = ?1")
      .bind(`appt:${apt.token}`)
      .first<{ status: string }>();
    return { sent: existing?.status !== "failed", channel: "cached", duplicate: true, patientCode: linked.patient.code };
  }
  if (apt.whatsappSent) {
    // Already sent before the database existed: log it as sent, don't send again.
    await record(db, id, { sent: true, channel: getConfiguredWhatsAppChannel(env) });
    return { sent: true, channel: "cached", duplicate: true, patientCode: linked.patient.code };
  }
  const res = await sendAppointmentConfirmation(env, linked.patient.phone, {
    patientName: apt.patientName,
    doctorName: apt.doctorName,
    date: apt.date,
    time: apt.time,
    token: apt.token,
  });
  await record(db, id, res);
  return { sent: res.sent, channel: res.channel, error: res.error, patientCode: linked.patient.code };
}

// ---------------------------------------------------------------------------
// Lab reports
// ---------------------------------------------------------------------------

export type LabReportRow = {
  id: string;
  patient_id: number;
  test_name: string;
  sample_date: string;
  status: "pending" | "processing" | "ready";
  delivery_status: "not_sent" | "queued" | "sent" | "delivered" | "read" | "failed";
  file_key: string | null;
  file_name: string | null;
  file_size: number | null;
  file_sha256: string | null;
  uploaded_at: number | null;
  uploaded_by: number | null;
  ready_at: number | null;
  ready_by: number | null;
  auto_sent_at: number | null;
  last_sent_at: number | null;
  delivered_at: number | null;
  notes: string | null;
  created_at: number;
  created_date: string;
  created_by: number | null;
  updated_at: number;
};

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function linkDays(env: CloudEnv): number {
  const n = Number(env.REPORT_LINK_DAYS);
  return Number.isFinite(n) && n >= 1 && n <= 365 ? Math.floor(n) : 30;
}

/** Creates a new secure link for one report. Only the SHA-256 of the token is stored. */
export async function createReportLink(db: SqlDatabase, env: CloudEnv, reportId: string): Promise<{ url: string; expiresAt: number }> {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = base64url(bytes);
  const now = Date.now();
  const expiresAt = now + linkDays(env) * 86_400_000;
  await db
    .prepare("INSERT INTO report_links (token_hash, report_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(await sha256Hex(`report-link:${token}`), reportId, now, expiresAt)
    .run();
  // The token sits after "#", so it never reaches server logs or analytics.
  return { url: `${clinic.siteUrl}/report/#${token}`, expiresAt };
}

export async function reportLinkHash(token: string): Promise<string> {
  return sha256Hex(`report-link:${token}`);
}

/** Signed, 15-minute URL a provider (Twilio, gateway) can fetch the PDF from. */
export async function signedMediaUrl(env: CloudEnv, secret: string, reportId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 15 * 60;
  const sig = await hmacSha256Hex(secret, `media:${reportId}:${exp}`);
  return `${clinic.siteUrl}/api/report/media?id=${encodeURIComponent(reportId)}&exp=${exp}&sig=${sig}`;
}

export function pdfKey(reportId: string): string {
  return `lab-pdf:${reportId}:${randomHex(8)}`;
}

async function refreshReportDelivery(db: SqlDatabase, reportId: string): Promise<void> {
  // The report shows the state of its most recent message.
  const latest = await db
    .prepare("SELECT status, delivered_at, read_at, sent_at FROM notifications WHERE kind = 'lab_report' AND ref_id = ?1 ORDER BY id DESC LIMIT 1")
    .bind(reportId)
    .first<{ status: NotificationStatus; delivered_at: number | null; read_at: number | null; sent_at: number | null }>();
  if (!latest) return;
  await db
    .prepare(
      `UPDATE lab_reports SET delivery_status = ?1, last_sent_at = COALESCE(?2, last_sent_at),
       delivered_at = COALESCE(?3, delivered_at), updated_at = ?4 WHERE id = ?5`,
    )
    .bind(latest.status, latest.sent_at, latest.delivered_at ?? latest.read_at, Date.now(), reportId)
    .run();
}

export type SendReportResult = { status: NotificationStatus | "skipped"; error?: string; duplicate?: boolean; notificationId?: number };

/**
 * Sends a ready report to its patient. `mode: "auto"` happens once per report (on Mark Ready);
 * `mode: "manual"` is a staff resend and always creates a new message with a fresh link.
 */
export async function sendReportToPatient(
  env: CloudEnv,
  db: SqlDatabase,
  secret: string,
  reportId: string,
  mode: "auto" | "manual",
  staffId: number | null,
): Promise<SendReportResult> {
  const report = await db.prepare("SELECT * FROM lab_reports WHERE id = ?1").bind(reportId).first<LabReportRow>();
  if (!report) return { status: "skipped", error: "Report not found" };
  if (report.status !== "ready") return { status: "skipped", error: "Mark the report Ready first." };
  if (!report.file_key) return { status: "skipped", error: "Upload the PDF first." };
  const patient = await db.prepare("SELECT * FROM patients WHERE id = ?1").bind(report.patient_id).first<PatientRow>();
  if (!patient) return { status: "skipped", error: "Patient record missing" };

  if (mode === "auto") {
    // Atomic: only the first caller gets to auto-send.
    const res = await db
      .prepare("UPDATE lab_reports SET auto_sent_at = ?1 WHERE id = ?2 AND auto_sent_at IS NULL")
      .bind(Date.now(), reportId)
      .run();
    if (changes(res) === 0) return { status: "skipped", duplicate: true, error: "Already sent automatically" };
  }

  // One automatic send per release: taking a report back to Processing and re-releasing it sends again.
  const key = mode === "auto" ? `lab-auto:${reportId}:${report.ready_at ?? 0}` : `lab-manual:${reportId}:${Date.now()}:${randomHex(4)}`;
  const id = await claim(db, env, {
    kind: "lab_report",
    refId: reportId,
    patientId: patient.id,
    phone: patient.phone,
    key,
    trigger: mode,
    createdBy: staffId,
  });
  if (id === null) return { status: "skipped", duplicate: true, error: "Already sent" };

  let res: WhatsAppDispatchResult;
  if (patient.phone_verified !== 1) {
    res = {
      sent: false,
      channel: getConfiguredWhatsAppChannel(env),
      error: "Mobile number not verified. Confirm it with the patient on their profile, then press Resend.",
    };
  } else {
    const link = await createReportLink(db, env, reportId);
    res = await sendLabReport(env, {
      phone: patient.phone,
      patientName: patient.name,
      link: link.url,
      fileName: report.file_name || `Lab-report-${patient.code}.pdf`,
      loadPdf: async () => (env.EP_KV ? env.EP_KV.get(report.file_key!, "arrayBuffer") : null),
      mediaUrl: () => signedMediaUrl(env, secret, reportId),
    });
  }
  const status = await record(db, id, res);
  await refreshReportDelivery(db, reportId);
  await audit(db, staffId, mode === "auto" ? "lab.auto_send" : "lab.resend", `report:${reportId}`, `${status} to ${maskPhone(patient.phone)}${res.error ? `: ${res.error}` : ""}`);
  return { status, error: res.error, notificationId: id };
}

// ---------------------------------------------------------------------------
// Retry
// ---------------------------------------------------------------------------

/** Retries one failed message. Refuses anything already sent, so retry can never duplicate a delivery. */
export async function retryNotification(
  env: CloudEnv,
  db: SqlDatabase,
  secret: string,
  notificationId: number,
  staffId: number | null,
  readKvAppointment: (token: string) => Promise<Appointment | null>,
): Promise<{ ok: boolean; status?: NotificationStatus; error?: string }> {
  const n = await db.prepare("SELECT * FROM notifications WHERE id = ?1").bind(notificationId).first<NotificationRow>();
  if (!n) return { ok: false, error: "Message not found" };
  if (n.status !== "failed") return { ok: false, error: "Only failed messages can be retried." };
  const locked = await db
    .prepare("UPDATE notifications SET status = 'queued', attempt = attempt + 1, updated_at = ?1 WHERE id = ?2 AND status = 'failed'")
    .bind(Date.now(), notificationId)
    .run();
  if (changes(locked) === 0) return { ok: false, error: "Someone else is already retrying this message." };
  await event(db, notificationId, "queued", `Retry ${n.attempt + 1} by staff`);

  let res: WhatsAppDispatchResult;
  const patient = n.patient_id ? await db.prepare("SELECT * FROM patients WHERE id = ?1").bind(n.patient_id).first<PatientRow>() : null;
  const phone = patient?.phone ?? n.to_phone;

  if (n.kind === "appointment_confirmation") {
    const apt = await readKvAppointment(n.ref_id);
    const rec = apt
      ? { patientName: apt.patientName, doctorName: apt.doctorName, date: apt.date, time: apt.time, token: apt.token }
      : await db
          .prepare("SELECT a.doctor_name AS doctorName, a.date, a.time, a.token, p.name AS patientName FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE a.token = ?1")
          .bind(n.ref_id)
          .first<{ doctorName: string; date: string; time: string | null; token: string; patientName: string }>();
    res = rec
      ? await sendAppointmentConfirmation(env, phone, { ...rec, time: rec.time ?? undefined })
      : { sent: false, channel: getConfiguredWhatsAppChannel(env), error: "Appointment no longer exists" };
  } else if (n.kind === "lab_report") {
    const report = await db.prepare("SELECT * FROM lab_reports WHERE id = ?1").bind(n.ref_id).first<LabReportRow>();
    if (!report || report.status !== "ready" || !report.file_key || !patient) {
      res = { sent: false, channel: getConfiguredWhatsAppChannel(env), error: "Report is not ready or has no PDF" };
    } else if (patient.phone_verified !== 1) {
      res = { sent: false, channel: getConfiguredWhatsAppChannel(env), error: "Mobile number not verified. Confirm it on the patient's profile first." };
    } else {
      const link = await createReportLink(db, env, report.id);
      res = await sendLabReport(env, {
        phone: patient.phone,
        patientName: patient.name,
        link: link.url,
        fileName: report.file_name || `Lab-report-${patient.code}.pdf`,
        loadPdf: async () => (env.EP_KV ? env.EP_KV.get(report.file_key!, "arrayBuffer") : null),
        mediaUrl: () => signedMediaUrl(env, secret, report.id),
      });
    }
  } else {
    res = { sent: false, channel: getConfiguredWhatsAppChannel(env), error: "Owner summaries are sent from Owner Reports." };
  }
  const status = await record(db, notificationId, res);
  if (n.kind === "lab_report") await refreshReportDelivery(db, n.ref_id);
  await audit(db, staffId, "notification.retry", `notification:${notificationId}`, status);
  return { ok: res.sent, status, error: res.error };
}

// ---------------------------------------------------------------------------
// Provider delivery updates
// ---------------------------------------------------------------------------

const RANK: Record<NotificationStatus, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

/** Applies a delivery update from Meta or Twilio. Never moves a message backwards (read → delivered). */
export async function applyDeliveryUpdate(
  db: SqlDatabase,
  providerMessageId: string,
  status: NotificationStatus,
  detail?: string,
  at: number = Date.now(),
): Promise<boolean> {
  await ensureSchema(db);
  const n = await db
    .prepare("SELECT id, kind, ref_id, status FROM notifications WHERE provider_message_id = ?1")
    .bind(providerMessageId)
    .first<{ id: number; kind: NotificationKind; ref_id: string; status: NotificationStatus }>();
  if (!n) return false;
  if (status !== "failed" && RANK[status] <= RANK[n.status]) return true;
  const col = status === "delivered" ? "delivered_at" : status === "read" ? "read_at" : status === "failed" ? "failed_at" : "sent_at";
  await db
    .prepare(`UPDATE notifications SET status = ?1, ${col} = ?2, error = CASE WHEN ?1 = 'failed' THEN ?3 ELSE error END, updated_at = ?2 WHERE id = ?4`)
    .bind(status, at, detail ?? null, n.id)
    .run();
  await event(db, n.id, status, detail ?? "Provider update");
  if (n.kind === "lab_report") await refreshReportDelivery(db, n.ref_id);
  return true;
}

export { NOT_CONFIGURED_ERROR };
