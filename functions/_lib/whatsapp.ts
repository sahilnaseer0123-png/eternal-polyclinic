// WhatsApp Business sending for Eternal Polyclinic (server side only).
//
// Providers, in order of preference (the first one configured is used):
//   1. Meta WhatsApp Cloud API   WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID   (recommended)
//   2. Twilio WhatsApp           TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM
//   3. Generic gateway webhook   WHATSAPP_WEBHOOK_URL (+ WHATSAPP_WEBHOOK_SECRET)
//
// Messages the clinic starts (confirmations, lab reports) must use a template Meta has approved;
// free text and plain documents are only accepted within 24 hours of the patient messaging the clinic.
// So for each message we send the approved template when its name is configured, otherwise we try the
// free-form message and report the provider's error honestly (it will usually be "outside the 24h window").
//
// PDFs: on Meta the file is uploaded with the Media API and sent as the template's DOCUMENT header, so the
// patient receives the actual PDF in the chat. On Twilio and gateways the provider fetches the file from a
// signed link that expires after 15 minutes (see functions/api/report/media.ts).

import type { Appointment } from "../../lib/appointments";
import {
  appointmentConfirmationText,
  appointmentTemplateParams,
  labReportText,
  type AppointmentMessageInput,
} from "../../lib/messages";
import { clinic } from "../../data/clinic";
import type { CloudEnv } from "./clinic-store";

const GRAPH = "https://graph.facebook.com/v21.0";

export type WhatsAppChannel = "meta_cloud_api" | "twilio" | "webhook" | "unconfigured";

export type WhatsAppDispatchResult = {
  sent: boolean;
  channel: WhatsAppChannel;
  providerMessageId?: string;
  error?: string;
};

export function getConfiguredWhatsAppChannel(env: CloudEnv): WhatsAppChannel {
  if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) return "meta_cloud_api";
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) return "twilio";
  if (env.WHATSAPP_WEBHOOK_URL) return "webhook";
  return "unconfigured";
}

export const NOT_CONFIGURED_ERROR =
  "WhatsApp Business API is not connected yet. Add the provider keys in Cloudflare (see docs/whatsapp-setup.md), then press Retry.";

/** What the dashboard shows about the WhatsApp setup (no secrets). */
export function whatsappSetupStatus(env: CloudEnv) {
  const channel = getConfiguredWhatsAppChannel(env);
  return {
    channel,
    appointmentTemplate: channel === "meta_cloud_api" ? Boolean(env.WHATSAPP_TEMPLATE_APPOINTMENT) : channel === "twilio" ? Boolean(env.TWILIO_CONTENT_SID_APPOINTMENT) : channel === "webhook",
    labReportTemplate: channel === "meta_cloud_api" ? Boolean(env.WHATSAPP_TEMPLATE_LAB_REPORT) : channel === "twilio" ? Boolean(env.TWILIO_CONTENT_SID_LAB_REPORT) : channel === "webhook",
    deliveryWebhook: channel === "meta_cloud_api" ? Boolean(env.WHATSAPP_VERIFY_TOKEN && env.WHATSAPP_APP_SECRET) : channel === "twilio",
  };
}

/** Patient confirmation text (approved 4 Nov 2026 format). Names the doctor, never the speciality (rule 4). */
export function buildPatientConfirmationMessage(apt: Appointment): string {
  return appointmentConfirmationText(toMessageInput(apt));
}

function toMessageInput(apt: Appointment): AppointmentMessageInput {
  return { patientName: apt.patientName, doctorName: apt.doctorName, date: apt.date, time: apt.time, token: apt.token };
}

function to10(phone: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  const ten = digits.length === 10 ? digits : digits.slice(-10);
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

async function readError(res: Response, label: string): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const j = JSON.parse(body) as { error?: { message?: string; code?: number; error_data?: { details?: string } }; message?: string };
    const msg = j.error?.error_data?.details || j.error?.message || j.message;
    if (msg) return `${label} ${res.status}: ${msg}`.slice(0, 300);
  } catch {
    // not JSON
  }
  return `${label} ${res.status}: ${body.slice(0, 200)}`;
}

// ---------------------------------------------------------------------------
// Meta WhatsApp Cloud API
// ---------------------------------------------------------------------------

async function metaSend(env: CloudEnv, payload: Record<string, unknown>): Promise<WhatsAppDispatchResult> {
  try {
    const res = await fetch(`${GRAPH}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...payload }),
    });
    if (!res.ok) return { sent: false, channel: "meta_cloud_api", error: await readError(res, "Meta") };
    const j = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
    return { sent: true, channel: "meta_cloud_api", providerMessageId: j.messages?.[0]?.id };
  } catch (err) {
    return { sent: false, channel: "meta_cloud_api", error: err instanceof Error ? err.message : "Meta API network failure" };
  }
}

/** Uploads a PDF to Meta's Media API; the returned id is valid for 30 days. */
export async function metaUploadPdf(env: CloudEnv, bytes: ArrayBuffer, fileName: string): Promise<{ id?: string; error?: string }> {
  try {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "application/pdf");
    form.append("file", new Blob([bytes], { type: "application/pdf" }), fileName);
    const res = await fetch(`${GRAPH}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` },
      body: form,
    });
    if (!res.ok) return { error: await readError(res, "Meta media upload") };
    const j = (await res.json()) as { id?: string };
    return j.id ? { id: j.id } : { error: "Meta media upload returned no id" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Meta media upload failed" };
  }
}

function lang(env: CloudEnv): string {
  return env.WHATSAPP_TEMPLATE_LANG?.trim() || "en";
}

// ---------------------------------------------------------------------------
// Twilio
// ---------------------------------------------------------------------------

async function twilioSend(env: CloudEnv, to10digits: string, fields: Record<string, string>): Promise<WhatsAppDispatchResult> {
  try {
    const sid = env.TWILIO_ACCOUNT_SID!.trim();
    const fromRaw = env.TWILIO_WHATSAPP_FROM!.trim();
    const form = new URLSearchParams({
      From: fromRaw.startsWith("whatsapp:") ? fromRaw : `whatsapp:${fromRaw}`,
      To: `whatsapp:+91${to10digits}`,
      StatusCallback: `${clinic.siteUrl}/api/whatsapp/twilio-status`,
      ...fields,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${env.TWILIO_AUTH_TOKEN!.trim()}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    if (!res.ok) return { sent: false, channel: "twilio", error: await readError(res, "Twilio") };
    const j = (await res.json().catch(() => ({}))) as { sid?: string };
    return { sent: true, channel: "twilio", providerMessageId: j.sid };
  } catch (err) {
    return { sent: false, channel: "twilio", error: err instanceof Error ? err.message : "Twilio network failure" };
  }
}

// ---------------------------------------------------------------------------
// Generic gateway
// ---------------------------------------------------------------------------

async function webhookSend(env: CloudEnv, body: Record<string, unknown>): Promise<WhatsAppDispatchResult> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (env.WHATSAPP_WEBHOOK_SECRET) {
      headers.Authorization = `Bearer ${env.WHATSAPP_WEBHOOK_SECRET}`;
      headers["X-Webhook-Secret"] = env.WHATSAPP_WEBHOOK_SECRET;
    }
    const res = await fetch(env.WHATSAPP_WEBHOOK_URL!, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) return { sent: false, channel: "webhook", error: `Gateway returned HTTP ${res.status}` };
    const j = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
    return { sent: true, channel: "webhook", providerMessageId: j.messageId ?? j.id };
  } catch (err) {
    return { sent: false, channel: "webhook", error: err instanceof Error ? err.message : "Gateway network failure" };
  }
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function sendAppointmentConfirmation(
  env: CloudEnv,
  phone: string,
  input: AppointmentMessageInput,
): Promise<WhatsAppDispatchResult> {
  const channel = getConfiguredWhatsAppChannel(env);
  const ten = to10(phone);
  if (!ten) return { sent: false, channel, error: "Invalid 10-digit Indian mobile number" };
  const text = appointmentConfirmationText(input);

  if (channel === "meta_cloud_api") {
    if (env.WHATSAPP_TEMPLATE_APPOINTMENT?.trim()) {
      return metaSend(env, {
        to: `91${ten}`,
        type: "template",
        template: {
          name: env.WHATSAPP_TEMPLATE_APPOINTMENT.trim(),
          language: { code: lang(env) },
          components: [{ type: "body", parameters: appointmentTemplateParams(input).map((t) => ({ type: "text", text: t })) }],
        },
      });
    }
    return metaSend(env, { to: `91${ten}`, type: "text", text: { preview_url: false, body: text } });
  }
  if (channel === "twilio") {
    if (env.TWILIO_CONTENT_SID_APPOINTMENT?.trim()) {
      const vars = Object.fromEntries(appointmentTemplateParams(input).map((v, i) => [String(i + 1), v]));
      return twilioSend(env, ten, { ContentSid: env.TWILIO_CONTENT_SID_APPOINTMENT.trim(), ContentVariables: JSON.stringify(vars) });
    }
    return twilioSend(env, ten, { Body: text });
  }
  if (channel === "webhook") {
    return webhookSend(env, { event: "appointment.confirmed", to: `91${ten}`, toE164: `+91${ten}`, message: text, appointment: input });
  }
  return { sent: false, channel, error: NOT_CONFIGURED_ERROR };
}

/** Kept for existing callers: sends the confirmation for one OPD-register appointment. */
export async function sendBookingConfirmationWhatsApp(apt: Appointment, env: CloudEnv): Promise<WhatsAppDispatchResult> {
  return sendAppointmentConfirmation(env, apt.patientPhone, toMessageInput(apt));
}

export type LabReportSend = {
  phone: string;
  patientName: string;
  link: string;
  fileName: string;
  /** Loads the PDF bytes (only read when the provider needs them). */
  loadPdf: () => Promise<ArrayBuffer | null>;
  /** A short-lived signed URL the provider can fetch the PDF from (Twilio / gateways). */
  mediaUrl: () => Promise<string>;
};

/** Sends the actual PDF as a WhatsApp document, with the secure link in the message. */
export async function sendLabReport(env: CloudEnv, r: LabReportSend): Promise<WhatsAppDispatchResult> {
  const channel = getConfiguredWhatsAppChannel(env);
  const ten = to10(r.phone);
  if (!ten) return { sent: false, channel, error: "Invalid 10-digit Indian mobile number" };
  const text = labReportText(r.patientName, r.link);

  if (channel === "meta_cloud_api") {
    const pdf = await r.loadPdf();
    if (!pdf) return { sent: false, channel, error: "The PDF file is missing from storage. Upload it again." };
    const media = await metaUploadPdf(env, pdf, r.fileName);
    if (!media.id) return { sent: false, channel, error: media.error };
    if (env.WHATSAPP_TEMPLATE_LAB_REPORT?.trim()) {
      return metaSend(env, {
        to: `91${ten}`,
        type: "template",
        template: {
          name: env.WHATSAPP_TEMPLATE_LAB_REPORT.trim(),
          language: { code: lang(env) },
          components: [
            { type: "header", parameters: [{ type: "document", document: { id: media.id, filename: r.fileName } }] },
            {
              type: "body",
              parameters: [
                { type: "text", text: r.patientName },
                { type: "text", text: r.link },
              ],
            },
          ],
        },
      });
    }
    // No template: a plain document with the message as caption (only accepted inside the 24h window)
    return metaSend(env, { to: `91${ten}`, type: "document", document: { id: media.id, filename: r.fileName, caption: text } });
  }
  if (channel === "twilio") {
    const mediaUrl = await r.mediaUrl();
    if (env.TWILIO_CONTENT_SID_LAB_REPORT?.trim()) {
      return twilioSend(env, ten, {
        ContentSid: env.TWILIO_CONTENT_SID_LAB_REPORT.trim(),
        ContentVariables: JSON.stringify({ "1": r.patientName, "2": r.link, "3": mediaUrl }),
      });
    }
    return twilioSend(env, ten, { Body: text, MediaUrl: mediaUrl });
  }
  if (channel === "webhook") {
    return webhookSend(env, {
      event: "lab_report.ready",
      to: `91${ten}`,
      toE164: `+91${ten}`,
      message: text,
      document: { url: await r.mediaUrl(), filename: r.fileName, mimeType: "application/pdf" },
    });
  }
  return { sent: false, channel, error: NOT_CONFIGURED_ERROR };
}

/** Free-text message (owner summary). Reaches the owner only if they messaged the clinic number in the last 24h. */
export async function sendPlainText(env: CloudEnv, phone: string, text: string): Promise<WhatsAppDispatchResult> {
  const channel = getConfiguredWhatsAppChannel(env);
  const ten = to10(phone);
  if (!ten) return { sent: false, channel, error: "Invalid 10-digit Indian mobile number" };
  if (channel === "meta_cloud_api") return metaSend(env, { to: `91${ten}`, type: "text", text: { preview_url: false, body: text } });
  if (channel === "twilio") return twilioSend(env, ten, { Body: text });
  if (channel === "webhook") return webhookSend(env, { event: "owner.summary", to: `91${ten}`, message: text });
  return { sent: false, channel, error: NOT_CONFIGURED_ERROR };
}
