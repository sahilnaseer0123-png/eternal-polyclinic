// Instant server-to-patient WhatsApp confirmation dispatcher for Eternal Polyclinic.
// Automatically sends a booking confirmation message FROM Eternal Polyclinic TO the patient's WhatsApp number
// whenever an appointment is booked, supporting:
//   1. Official Meta WhatsApp Cloud API (WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID [+ optional WHATSAPP_TEMPLATE_NAME])
//   2. Twilio WhatsApp API (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM)
//   3. Any WhatsApp Business Webhook / Gateway (WHATSAPP_WEBHOOK_URL [+ optional WHATSAPP_WEBHOOK_SECRET])

import { clinic } from "../../data/clinic";
import type { Appointment } from "../../lib/appointments";
import { dateLabel, formatTime } from "../../lib/schedule";
import type { CloudEnv } from "./clinic-store";

export type WhatsAppDispatchResult = {
  sent: boolean;
  channel: "meta_cloud_api" | "twilio" | "webhook" | "unconfigured";
  error?: string;
};

export function getConfiguredWhatsAppChannel(
  env: CloudEnv,
): "meta_cloud_api" | "twilio" | "webhook" | "unconfigured" {
  if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) return "meta_cloud_api";
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) return "twilio";
  if (env.WHATSAPP_WEBHOOK_URL) return "webhook";
  return "unconfigured";
}

/**
 * Formats the official patient confirmation message sent from Eternal Polyclinic.
 * Follows CLAUDE.md Rule 4: names the consultant doctor, never the medical speciality,
 * so lock-screen notifications on shared family phones protect patient privacy.
 */
export function buildPatientConfirmationMessage(apt: Appointment): string {
  const toE164Display = `+91 ${apt.patientPhone.slice(0, 5)} ${apt.patientPhone.slice(5)}`;
  return [
    `✅ *BOOKING CONFIRMED · ${clinic.name.toUpperCase()}, SOPORE*`,
    `──────────────────────────`,
    `Assalamu Alaikum / Hello *${apt.patientName}*,`,
    `Your appointment at *${clinic.name}* has been confirmed.`,
    ``,
    `🎟️ *Token No:* ${apt.token}`,
    `🩺 *Doctor:* ${apt.doctorName}`,
    `📅 *Date:* ${dateLabel(apt.date)} (${apt.date})`,
    `⏰ *Slot Time:* ${formatTime(apt.time)}`,
    apt.patientAddress ? `📍 *Area/Village:* ${apt.patientAddress}` : null,
    `📱 *Registered Mobile:* ${toE164Display}`,
    `──────────────────────────`,
    `🏥 *Clinic Address:*`,
    `${clinic.address} (${clinic.location.name} building)`,
    `🗺️ *Directions:* ${clinic.mapUrl}`,
    ``,
    `ℹ️ *Important Instructions:*`,
    `• Please arrive *10–15 minutes early* and show Token *${apt.token}* at Reception.`,
    `• Consultation fee is payable at reception (zero clinic registration fee).`,
    `• Please bring any previous prescriptions or test reports.`,
    ``,
    `📞 *Reception Helpline:* ${clinic.phoneDisplay}`,
    `🔬 *Lab Reports Desk:* ${clinic.labTechPhoneDisplay}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function sendBookingConfirmationWhatsApp(
  apt: Appointment,
  env: CloudEnv,
): Promise<WhatsAppDispatchResult> {
  const digits = apt.patientPhone.replace(/\D/g, "");
  const cleanPhone = digits.length === 10 ? digits : digits.slice(-10);
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return { sent: false, channel: getConfiguredWhatsAppChannel(env), error: "Invalid 10-digit Indian mobile number" };
  }

  const recipientE164NoPlus = `91${cleanPhone}`;
  const recipientE164Plus = `+91${cleanPhone}`;
  const messageText = buildPatientConfirmationMessage(apt);

  // 1. Official Meta WhatsApp Cloud API
  if (env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID)}/messages`;
    const headers = {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    };

    try {
      // If a pre-approved Meta utility template name is provided, try sending template first
      // (required by Meta for business-initiated messages outside a 24h customer chat window).
      if (env.WHATSAPP_TEMPLATE_NAME && env.WHATSAPP_TEMPLATE_NAME.trim()) {
        const tplRes = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipientE164NoPlus,
            type: "template",
            template: {
              name: env.WHATSAPP_TEMPLATE_NAME.trim(),
              language: { code: env.WHATSAPP_TEMPLATE_LANG?.trim() || "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: apt.patientName },
                    { type: "text", text: apt.token },
                    { type: "text", text: apt.doctorName },
                    { type: "text", text: `${dateLabel(apt.date)} (${apt.date})` },
                    { type: "text", text: formatTime(apt.time) },
                    { type: "text", text: `${clinic.address} · Helpline ${clinic.phoneDisplay}` },
                  ],
                },
              ],
            },
          }),
        });
        if (tplRes.ok) {
          return { sent: true, channel: "meta_cloud_api" };
        }
      }

      // Standard text message dispatch
      const textRes = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientE164NoPlus,
          type: "text",
          text: { preview_url: false, body: messageText },
        }),
      });

      if (textRes.ok) {
        return { sent: true, channel: "meta_cloud_api" };
      }
      const errBody = await textRes.text().catch(() => "");
      return {
        sent: false,
        channel: "meta_cloud_api",
        error: `Meta API ${textRes.status}: ${errBody.slice(0, 180)}`,
      };
    } catch (err) {
      return {
        sent: false,
        channel: "meta_cloud_api",
        error: err instanceof Error ? err.message : "Meta API network failure",
      };
    }
  }

  // 2. Twilio WhatsApp API
  if (env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_WHATSAPP_FROM) {
    try {
      const sid = env.TWILIO_ACCOUNT_SID.trim();
      const from = env.TWILIO_WHATSAPP_FROM.trim().startsWith("whatsapp:")
        ? env.TWILIO_WHATSAPP_FROM.trim()
        : `whatsapp:${env.TWILIO_WHATSAPP_FROM.trim()}`;
      const form = new URLSearchParams({
        From: from,
        To: `whatsapp:${recipientE164Plus}`,
        Body: messageText,
      });
      const basic = btoa(`${sid}:${env.TWILIO_AUTH_TOKEN.trim()}`);
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      });
      if (res.ok) {
        return { sent: true, channel: "twilio" };
      }
      const errBody = await res.text().catch(() => "");
      return { sent: false, channel: "twilio", error: `Twilio ${res.status}: ${errBody.slice(0, 180)}` };
    } catch (err) {
      return {
        sent: false,
        channel: "twilio",
        error: err instanceof Error ? err.message : "Twilio network failure",
      };
    }
  }

  // 3. Generic WhatsApp Gateway Webhook (Wati, AiSensy, Interakt, UltraMsg, Evolution API, Make/Zapier)
  if (env.WHATSAPP_WEBHOOK_URL) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (env.WHATSAPP_WEBHOOK_SECRET) {
        headers["Authorization"] = `Bearer ${env.WHATSAPP_WEBHOOK_SECRET}`;
        headers["X-Webhook-Secret"] = env.WHATSAPP_WEBHOOK_SECRET;
      }
      const res = await fetch(env.WHATSAPP_WEBHOOK_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({
          event: "appointment.confirmed",
          clinic: clinic.name,
          to: recipientE164NoPlus,
          toE164: recipientE164Plus,
          phone: cleanPhone,
          message: messageText,
          appointment: {
            token: apt.token,
            patientName: apt.patientName,
            patientPhone: cleanPhone,
            patientAddress: apt.patientAddress ?? "",
            doctorId: apt.doctorId,
            doctorName: apt.doctorName,
            date: apt.date,
            dateFormatted: dateLabel(apt.date),
            time: apt.time,
            timeFormatted: formatTime(apt.time),
            address: clinic.address,
            mapUrl: clinic.mapUrl,
            helpline: clinic.phoneDisplay,
          },
        }),
      });
      if (res.ok) {
        return { sent: true, channel: "webhook" };
      }
      return { sent: false, channel: "webhook", error: `Webhook returned HTTP ${res.status}` };
    } catch (err) {
      return {
        sent: false,
        channel: "webhook",
        error: err instanceof Error ? err.message : "Webhook network failure",
      };
    }
  }

  return { sent: false, channel: "unconfigured" };
}

