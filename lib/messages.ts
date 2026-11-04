// Every WhatsApp message the clinic sends, in one place, in the owner's approved wording (brief of 4 Nov 2026).
// Pure functions: used by the browser (copy/share buttons) and by Cloudflare Functions (automatic sends).
// Rule 4: messages name the doctor, never the speciality. No helpline line, no address (the patient already knows both).

import { formatTime } from "./schedule";

const CLINIC = "ETERNAL POLYCLINIC";

export type AppointmentMessageInput = {
  patientName: string;
  doctorName: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  token?: string;
};

/** "Thu 6 Nov 2026" for a YYYY-MM-DD clinic date. */
export function longDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return dateKey;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${DAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

/** "4:30 pm · Token EP-AK1106-03" (either part may be missing). */
export function timeOrToken(time?: string, token?: string): string {
  const parts = [time ? formatTime(time) : null, token ? `Token ${token}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Reception will call you";
}

export function appointmentConfirmationText(a: AppointmentMessageInput): string {
  return [
    `*${CLINIC}*`,
    ``,
    `Hello ${a.patientName},`,
    ``,
    `Your appointment at Eternal Polyclinic has been successfully booked.`,
    ``,
    `Doctor: ${a.doctorName}`,
    `Appointment Date: ${longDate(a.date)}`,
    `Appointment Time/Token: ${timeOrToken(a.time, a.token)}`,
    ``,
    `Thank you for choosing Eternal Polyclinic.`,
  ].join("\n");
}

/** Template parameters for the Meta template "appointment_confirmation" (see docs/whatsapp-setup.md). */
export function appointmentTemplateParams(a: AppointmentMessageInput): string[] {
  return [a.patientName, a.doctorName, longDate(a.date), timeOrToken(a.time, a.token)];
}

export function labReportText(patientName: string, link: string): string {
  return [
    `*${CLINIC}*`,
    ``,
    `Hello ${patientName},`,
    ``,
    `Your lab report is ready!`,
    ``,
    `Your completed lab report is attached to this message as a PDF.`,
    ``,
    `You can also access and download your report securely through our website:`,
    ``,
    link,
    ``,
    `Thank you for choosing Eternal Polyclinic.`,
  ].join("\n");
}

export type OwnerSummaryStats = {
  date: string; // YYYY-MM-DD
  totalPatients: number;
  newRegistrations: number;
  appointmentsBooked: number;
  completedAppointments: number;
  pendingAppointments: number;
  cancelledAppointments?: number;
  reportsUploaded: number;
  reportsPending: number;
  reportsDelivered: number;
  failedDeliveries: number;
  /** Optional per-doctor lines for the overview, e.g. { name: "Dr Akash", booked: 12, done: 9 } */
  doctors?: { name: string; booked: number; done: number }[];
  walkIns?: number;
  online?: number;
  /** Set when the lab figures could not be read (database not connected). */
  labUnavailable?: boolean;
};

/** Owner's daily WhatsApp summary. No helpline, no address, minimal emoji, WhatsApp *bold* headings. */
export function ownerSummaryText(s: OwnerSummaryStats): string {
  const lab = (n: number) => (s.labUnavailable ? "—" : String(n));
  const overview: string[] = [];
  if (s.doctors && s.doctors.length > 0) {
    for (const d of s.doctors) overview.push(`- ${d.name}: ${d.booked} booked, ${d.done} seen`);
  }
  if (s.walkIns !== undefined || s.online !== undefined) {
    overview.push(`- Reception bookings: ${s.walkIns ?? 0} · Online bookings: ${s.online ?? 0}`);
  }
  if (s.cancelledAppointments) overview.push(`- Cancelled: ${s.cancelledAppointments}`);
  if (s.labUnavailable) overview.push(`- Lab figures unavailable: database not connected`);
  if (overview.length === 0) overview.push(`- No appointments recorded for this date.`);

  return [
    `*${CLINIC}*`,
    ``,
    `*DAILY ACTIVITY SUMMARY*`,
    ``,
    `Date: ${longDate(s.date)}`,
    ``,
    `*PATIENT STATISTICS*`,
    `- Total Patients: ${s.totalPatients}`,
    `- New Registrations: ${s.newRegistrations}`,
    `- Appointments Booked: ${s.appointmentsBooked}`,
    `- Completed Appointments: ${s.completedAppointments}`,
    `- Pending Appointments: ${s.pendingAppointments}`,
    ``,
    `*LAB REPORTS*`,
    `- Reports Uploaded: ${lab(s.reportsUploaded)}`,
    `- Reports Pending: ${lab(s.reportsPending)}`,
    `- Reports Delivered: ${lab(s.reportsDelivered)}`,
    `- Failed Deliveries: ${lab(s.failedDeliveries)}`,
    ``,
    `*DAILY OVERVIEW*`,
    ``,
    ...overview,
  ].join("\n");
}
