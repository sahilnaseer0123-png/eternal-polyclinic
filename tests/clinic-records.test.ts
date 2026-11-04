// End-to-end tests of the clinic records system through the real Pages Functions handlers:
// staff roles, reception bookings + WhatsApp confirmation, patient de-duplication, lab report upload →
// Ready → actual PDF on WhatsApp + secure link, patient access, retries, webhooks, owner summary, statistics.

import assert from "node:assert/strict";
import { test } from "node:test";
import { doctors } from "@/data/clinic";
import { createMemoryKV, createSessionCookie, resolveStorageDriver, type CfPagesContext, type CloudEnv } from "@/functions/_lib/clinic-store";
import type { Appointment } from "@/lib/appointments";
import { nextOpdDates, timeSlots, clinicClock } from "@/lib/schedule";
import { onRequestGet as authGet, onRequestPost as authPost } from "@/functions/api/admin/auth";
import { onRequestGet as stateGet, onRequestPost as statePost } from "@/functions/api/admin/state";
import { onRequestGet as patientsGet, onRequestPost as patientsPost } from "@/functions/api/staff/patients";
import { onRequestGet as patientGet, onRequestPatch as patientPatch } from "@/functions/api/staff/patients/[id]";
import { onRequestGet as reportsGet, onRequestPost as reportsPost } from "@/functions/api/staff/lab-reports";
import { onRequestGet as reportGet, onRequestPatch as reportPatch } from "@/functions/api/staff/lab-reports/[id]";
import { onRequestGet as fileGet, onRequestPut as filePut, checkPdf } from "@/functions/api/staff/lab-reports/[id]/file";
import { onRequestPost as resendPost } from "@/functions/api/staff/lab-reports/[id]/send";
import { onRequestGet as notesGet, onRequestPost as notesPost } from "@/functions/api/staff/notifications";
import { onRequestGet as summaryGet } from "@/functions/api/staff/summary";
import { onRequestGet as statsGet } from "@/functions/api/staff/stats";
import { onRequestGet as accountsGet, onRequestPatch as accountsPatch, onRequestPost as accountsPost } from "@/functions/api/staff/accounts";
import { onRequestPost as viewPost } from "@/functions/api/report/view";
import { onRequestPost as webhookPost } from "@/functions/api/whatsapp/webhook";
import { onRequestPost as bookPost } from "@/functions/api/book";
import { createTestD1, fakeWhatsApp, tinyPdf } from "./helpers/d1";

const BASE = "https://eternal-polyclinic.pages.dev";
const META = { WHATSAPP_ACCESS_TOKEN: "test-token", WHATSAPP_PHONE_NUMBER_ID: "1234567890", WHATSAPP_TEMPLATE_APPOINTMENT: "appointment_confirmation", WHATSAPP_TEMPLATE_LAB_REPORT: "lab_report_ready", WHATSAPP_APP_SECRET: "app-secret", WHATSAPP_VERIFY_TOKEN: "verify" };

function makeEnv(extra: Partial<CloudEnv> = {}): CloudEnv {
  return { EP_KV: createMemoryKV(), EP_SQL: createTestD1(), SESSION_SECRET: "test-secret-0123456789abcdef", ...extra };
}

function ctx(env: CloudEnv, path: string, init: RequestInit & { cookie?: string } = {}, params?: Record<string, string>): CfPagesContext {
  const headers = new Headers(init.headers);
  if (init.cookie) headers.set("Cookie", init.cookie);
  if (init.body && typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return { request: new Request(`${BASE}${path}`, { ...init, headers }), env, params };
}

const json = (body: unknown) => JSON.stringify(body);

function cookieFrom(res: Response, name = "ep_staff_session"): string {
  const all = res.headers.getSetCookie?.() ?? [res.headers.get("Set-Cookie") ?? ""];
  const c = all.find((h) => h.startsWith(`${name}=`));
  assert.ok(c, `expected ${name} cookie`);
  return c.split(";")[0];
}

async function legacyPinCookie(env: CloudEnv): Promise<string> {
  const res = await authPost(ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "login", pin: "1234" }) }));
  assert.equal(res.status, 200);
  return cookieFrom(res, "ep_admin_session");
}

/** Owner set up from the old PIN, plus a reception and a lab account. */
async function setupClinic(env: CloudEnv) {
  const setup = await authPost(
    ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "setup_owner", pin: "1234", username: "naseer", displayName: "Naseer Ah Lone", password: "clinic-owner-1" }) }),
  );
  assert.equal(setup.status, 200, await setup.clone().text());
  const owner = cookieFrom(setup);
  for (const [username, role] of [["reception1", "reception"], ["lab1", "lab"]] as const) {
    const r = await accountsPost(ctx(env, "/api/staff/accounts", { method: "POST", cookie: owner, body: json({ username, displayName: username, role, password: "password-123" }) }));
    assert.equal(r.status, 201, await r.clone().text());
  }
  const login = async (username: string) =>
    cookieFrom(await authPost(ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "login", username, password: "password-123" }) })));
  return { owner, reception: await login("reception1"), lab: await login("lab1") };
}

function bookableSlot(offsetDays = 0) {
  const now = new Date(Date.now() + offsetDays * 86_400_000);
  for (const doctor of doctors) {
    for (const { date } of nextOpdDates(doctor, now, 4)) {
      const slots = timeSlots(doctor, date, now);
      if (slots.length >= 3) return { doctor, date, slots };
    }
  }
  throw new Error("no slots");
}

function walkIn(over: Partial<Appointment> = {}): Appointment {
  const { doctor, date, slots } = bookableSlot();
  return {
    token: `EP-T${Math.random().toString(36).slice(2, 8).toUpperCase()}-W`,
    doctorId: doctor.id,
    doctorName: doctor.name ?? doctor.speciality,
    speciality: doctor.speciality,
    date,
    time: slots[0],
    patientName: "Tariq Ahmad",
    patientPhone: "9876543210",
    type: "walk_in",
    status: "arrived",
    createdAt: Date.now(),
    ...over,
  };
}

// ---------------------------------------------------------------------------

test("staff accounts: PIN only until the owner account exists; roles enforced", async () => {
  const env = makeEnv();
  const pinCookie = await legacyPinCookie(env);
  assert.equal((await stateGet(ctx(env, "/api/admin/state", { cookie: pinCookie }))).status, 200, "PIN works before accounts");

  const { owner, reception, lab } = await setupClinic(env);

  // The shared PIN is now switched off
  assert.equal((await stateGet(ctx(env, "/api/admin/state", { cookie: pinCookie }))).status, 401);
  const pinAgain = await authPost(ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "login", pin: "1234" }) }));
  assert.equal(pinAgain.status, 401);

  // Roles
  assert.equal((await stateGet(ctx(env, "/api/admin/state", { cookie: reception }))).status, 200);
  assert.equal((await stateGet(ctx(env, "/api/admin/state", { cookie: lab }))).status, 403, "lab can't open the OPD register");
  assert.equal((await accountsGet(ctx(env, "/api/staff/accounts", { cookie: reception }))).status, 403);
  assert.equal((await statsGet(ctx(env, "/api/staff/stats", { cookie: lab }))).status, 403);
  const me = await (await authGet(ctx(env, "/api/admin/auth", { cookie: owner }))).json();
  assert.equal(me.staff.role, "owner");
  assert.equal(me.staffMode, "accounts");

  // Wrong password x5 locks the account
  for (let i = 0; i < 5; i++) {
    await authPost(ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "login", username: "lab1", password: "nope-nope-1" }) }));
  }
  const locked = await authPost(ctx(env, "/api/admin/auth", { method: "POST", body: json({ action: "login", username: "lab1", password: "password-123" }) }));
  assert.equal(locked.status, 401);
  assert.match((await locked.json()).error, /Too many wrong tries/);

  // Deactivating signs the person out immediately; last owner can't be removed
  const list = (await (await accountsGet(ctx(env, "/api/staff/accounts", { cookie: owner }))).json()).staff;
  const recId = list.find((s: { username: string }) => s.username === "reception1").id;
  const ownerId = list.find((s: { username: string }) => s.username === "naseer").id;
  await accountsPatch(ctx(env, "/api/staff/accounts", { method: "PATCH", cookie: owner, body: json({ id: recId, active: false }) }));
  assert.equal((await stateGet(ctx(env, "/api/admin/state", { cookie: reception }))).status, 401);
  const demote = await accountsPatch(ctx(env, "/api/staff/accounts", { method: "PATCH", cookie: owner, body: json({ id: ownerId, role: "lab" }) }));
  assert.equal(demote.status, 400);
});

test("reception booking: new patient created, confirmation sent once in the approved format; existing patient not duplicated", async () => {
  const wa = fakeWhatsApp();
  try {
    const env = makeEnv(META);
    const { reception } = await setupClinic(env);

    const apt = walkIn();
    const r1 = await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: apt }) }));
    const b1 = await r1.json();
    assert.equal(b1.notification.sent, true);
    assert.match(b1.notification.patientCode, /^EPP-\d{5}$/);
    assert.equal(b1.state.appointments[0].whatsappSent, true);

    const sends = wa.calls.filter((c) => c.url.endsWith("/messages"));
    assert.equal(sends.length, 1);
    const tpl = (sends[0].body as { template: { name: string; components: { parameters: { text: string }[] }[] } }).template;
    assert.equal(tpl.name, "appointment_confirmation");
    const params = tpl.components[0].parameters.map((p) => p.text);
    assert.equal(params[0], "Tariq Ahmad");
    assert.equal(params[1], apt.doctorName);
    assert.ok(params[3].includes(apt.token), "time/token parameter carries the token");
    assert.ok(!params.join(" ").includes(apt.speciality), "never the speciality");

    // Same appointment saved again (edit / second tablet): no second message
    await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: { ...apt, whatsappSent: false } }) }));
    assert.equal(wa.calls.filter((c) => c.url.endsWith("/messages")).length, 1, "duplicate prevented");

    // Existing patient, second visit with another doctor: same patient record
    const apt2 = walkIn({ token: "EP-SECOND-W", patientName: "  tariq   AHMAD ", time: bookableSlot().slots[1] });
    const b2 = await (await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: apt2 }) }))).json();
    assert.equal(b2.notification.patientCode, b1.notification.patientCode);

    // Family member on the same phone: a separate patient
    const apt3 = walkIn({ token: "EP-FAMILY-W", patientName: "Shazia Tariq", time: bookableSlot().slots[2] });
    const b3 = await (await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: apt3 }) }))).json();
    assert.notEqual(b3.notification.patientCode, b1.notification.patientCode);

    const found = await (await patientsGet(ctx(env, "/api/staff/patients?phone=9876543210", { cookie: reception }))).json();
    assert.equal(found.total, 2);
    const tariq = found.patients.find((p: { name: string }) => p.name === "Tariq Ahmad");
    assert.equal(tariq.visitCount, 2);
    assert.equal(tariq.phoneVerified, true, "reception walk-ins are verified in person");

    // Status change and deletion are mirrored; deleted visits stay in history
    await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "update_appointment_status", token: apt.token, status: "completed" }) }));
    await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "delete_appointment", token: apt2.token }) }));
    const profile = await (await patientGet(ctx(env, `/api/staff/patients/${tariq.id}`, { cookie: reception }, { id: String(tariq.id) }))).json();
    assert.equal(profile.appointments.length, 2);
    assert.equal(profile.appointments.find((a: { token: string }) => a.token === apt.token).status, "completed");
    assert.ok(profile.appointments.find((a: { token: string }) => a.token === apt2.token).deleted_at);
  } finally {
    wa.restore();
  }
});

test("WhatsApp not connected: appointment still saved, failure logged, retry works once keys are added", async () => {
  const env = makeEnv(); // no provider keys
  const { reception } = await setupClinic(env);
  const apt = walkIn();
  const b = await (await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: apt }) }))).json();
  assert.equal(b.ok, true);
  assert.equal(b.state.appointments.length, 1, "appointment saved regardless");
  assert.equal(b.notification.sent, false);

  const log = await (await notesGet(ctx(env, "/api/staff/notifications?status=failed", { cookie: reception }))).json();
  assert.equal(log.failedCount, 1);
  assert.match(log.notifications[0].error, /not connected yet/);
  assert.equal(log.whatsapp.channel, "unconfigured");

  // Keys added later → Retry sends it, and a second retry is refused (no duplicates)
  Object.assign(env, META);
  const wa = fakeWhatsApp();
  try {
    const retry = await notesPost(ctx(env, "/api/staff/notifications", { method: "POST", cookie: reception, body: json({ id: log.notifications[0].id }) }));
    assert.equal(retry.status, 200, await retry.clone().text());
    const again = await notesPost(ctx(env, "/api/staff/notifications", { method: "POST", cookie: reception, body: json({ id: log.notifications[0].id }) }));
    assert.equal(again.status, 400);
    assert.equal(wa.calls.filter((c) => c.url.endsWith("/messages")).length, 1);
  } finally {
    wa.restore();
  }
});

test("online booking links the patient (unverified mobile) and logs the confirmation", async () => {
  const env = makeEnv();
  const { doctor, date, slots } = bookableSlot();
  const res = await bookPost(ctx(env, "/api/book", { method: "POST", body: json({ doctorId: doctor.id, date, time: slots[0], name: "Online Person", phone: "9811112222" }) }));
  assert.equal(res.status, 200);
  const { owner } = await setupClinic(env);
  const found = await (await patientsGet(ctx(env, "/api/staff/patients?q=Online", { cookie: owner }))).json();
  assert.equal(found.total, 1);
  assert.equal(found.patients[0].phoneVerified, false, "self-booked numbers are not verified");
});

test("lab report: upload → Ready sends the actual PDF + secure link once; patient opens it; others can't", async () => {
  const wa = fakeWhatsApp();
  try {
    const env = makeEnv(META);
    const { lab, reception, owner } = await setupClinic(env);

    // Lab registers the patient at the counter (mobile confirmed in person)
    const pRes = await patientsPost(ctx(env, "/api/staff/patients", { method: "POST", cookie: lab, body: json({ name: "Fatima Bano", phone: "+91 98765 11111", verified: true }) }));
    assert.equal(pRes.status, 201);
    const patient = (await pRes.json()).patient;
    // Second lab visit doesn't duplicate
    const again = await (await patientsPost(ctx(env, "/api/staff/patients", { method: "POST", cookie: lab, body: json({ name: "fatima bano", phone: "9876511111" }) }))).json();
    assert.equal(again.created, false);
    assert.equal(again.patient.id, patient.id);

    // Reception can't create lab reports
    assert.equal((await reportsPost(ctx(env, "/api/staff/lab-reports", { method: "POST", cookie: reception, body: json({ patientId: patient.id, testName: "CBC" }) }))).status, 403);

    const created = await (await reportsPost(ctx(env, "/api/staff/lab-reports", { method: "POST", cookie: lab, body: json({ patientId: patient.id, testName: "Complete Blood Count" }) }))).json();
    const id = created.report.id as string;
    assert.equal(created.report.status, "pending");
    assert.equal(created.report.deliveryStatus, "not_sent");

    // Can't release without a PDF; bad files rejected
    assert.equal((await reportPatch(ctx(env, `/api/staff/lab-reports/${id}`, { method: "PATCH", cookie: lab, body: json({ status: "ready" }) }, { id }))).status, 400);
    const notPdf = await filePut(ctx(env, `/api/staff/lab-reports/${id}/file`, { method: "PUT", cookie: lab, body: new TextEncoder().encode("x".repeat(3000)), headers: { "Content-Type": "application/pdf" } }, { id }));
    assert.equal(notPdf.status, 422);

    const up = await filePut(ctx(env, `/api/staff/lab-reports/${id}/file`, { method: "PUT", cookie: lab, body: tinyPdf(), headers: { "Content-Type": "application/pdf", "X-File-Name": "CBC Fatima.pdf" } }, { id }));
    assert.equal(up.status, 200, await up.clone().text());
    assert.equal((await up.json()).status, "processing");

    // Staff can view the PDF
    const staffView = await fileGet(ctx(env, `/api/staff/lab-reports/${id}/file`, { cookie: reception }, { id }));
    assert.equal(staffView.headers.get("Content-Type"), "application/pdf");
    assert.equal(staffView.headers.get("Cache-Control"), "private, no-store");

    // Mark Ready → automatic send of the real document
    const ready = await (await reportPatch(ctx(env, `/api/staff/lab-reports/${id}`, { method: "PATCH", cookie: lab, body: json({ status: "ready" }) }, { id }))).json();
    assert.equal(ready.report.status, "ready");
    assert.equal(ready.send.status, "sent");
    assert.equal(ready.report.deliveryStatus, "sent");

    const upload = wa.calls.find((c) => c.url.endsWith("/1234567890/media"));
    assert.ok(upload, "PDF uploaded to the Media API");
    assert.match(String((upload.body as Record<string, string>).file), /CBC Fatima\.pdf/);
    const msg = wa.calls.find((c) => c.url.endsWith("/messages"))!.body as {
      to: string;
      template: { name: string; components: { type: string; parameters: { type: string; text?: string; document?: { id: string; filename: string } }[] }[] };
    };
    assert.equal(msg.to, "919876511111", "sent to the registered mobile only");
    assert.equal(msg.template.name, "lab_report_ready");
    const header = msg.template.components.find((c) => c.type === "header")!;
    assert.equal(header.parameters[0].type, "document", "the PDF is the message's document header");
    assert.equal(header.parameters[0].document!.filename, "CBC Fatima.pdf");
    const bodyParams = msg.template.components.find((c) => c.type === "body")!.parameters;
    assert.equal(bodyParams[0].text, "Fatima Bano");
    const link = bodyParams[1].text!;
    assert.match(link, /^https:\/\/eternal-polyclinic\.pages\.dev\/report\/#[A-Za-z0-9_-]{32}$/);

    // Clicking Ready again doesn't send twice
    const twice = await (await reportPatch(ctx(env, `/api/staff/lab-reports/${id}`, { method: "PATCH", cookie: lab, body: json({ status: "ready" }) }, { id }))).json();
    assert.equal(twice.send.duplicate, true);
    assert.equal(wa.calls.filter((c) => c.url.endsWith("/messages")).length, 1);

    // Patient opens the link: needs the last 4 digits of the registered mobile
    const token = link.split("#")[1];
    const wrong = await viewPost(ctx(env, "/api/report/view", { method: "POST", body: json({ token, last4: "0000" }) }));
    assert.equal(wrong.status, 403);
    const view = await viewPost(ctx(env, "/api/report/view", { method: "POST", body: json({ token, last4: "1111" }) }));
    assert.equal(view.status, 200);
    assert.equal(view.headers.get("Content-Type"), "application/pdf");
    const meta = JSON.parse(decodeURIComponent(view.headers.get("X-Report")!));
    assert.equal(meta.testName, "Complete Blood Count");
    assert.equal(new Uint8Array(await view.arrayBuffer()).length, tinyPdf().byteLength);

    // Another patient's last 4 digits, or a made-up token, open nothing
    const other = await viewPost(ctx(env, "/api/report/view", { method: "POST", body: json({ token, last4: "3210" }) }));
    assert.equal(other.status, 403);
    const fake = await viewPost(ctx(env, "/api/report/view", { method: "POST", body: json({ token: "A".repeat(32), last4: "1111" }) }));
    assert.equal(fake.status, 404);

    // Provider webhook marks it delivered (signed by Meta)
    const payload = json({ entry: [{ changes: [{ value: { statuses: [{ id: "wamid.TEST2", status: "delivered", timestamp: String(Math.floor(Date.now() / 1000)) }] } }] }] });
    const unsigned = await webhookPost(ctx(env, "/api/whatsapp/webhook", { method: "POST", body: payload }));
    assert.equal(unsigned.status, 401, "unsigned webhooks rejected");
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("app-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = Buffer.from(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))).toString("hex");
    const signed = await webhookPost(ctx(env, "/api/whatsapp/webhook", { method: "POST", body: payload, headers: { "X-Hub-Signature-256": `sha256=${sig}` } }));
    assert.equal(signed.status, 200);
    const detail = await (await reportGet(ctx(env, `/api/staff/lab-reports/${id}`, { cookie: owner }, { id }))).json();
    assert.equal(detail.report.deliveryStatus, "delivered");
    assert.ok(detail.events.some((e: { status: string }) => e.status === "delivered"), "delivery history kept");

    // Manual resend: new message, new link
    const resend = await resendPost(ctx(env, `/api/staff/lab-reports/${id}/send`, { method: "POST", cookie: owner }, { id }));
    assert.equal(resend.status, 200);
    assert.equal(wa.calls.filter((c) => c.url.endsWith("/messages")).length, 2);
    const hist = await (await reportGet(ctx(env, `/api/staff/lab-reports/${id}`, { cookie: owner }, { id }))).json();
    assert.equal(hist.messages.length, 2);
    assert.deepEqual(hist.messages.map((m: { trigger: string }) => m.trigger).sort(), ["auto", "manual"]);

    // Search by patient ID, name, status
    const byCode = await (await reportsGet(ctx(env, `/api/staff/lab-reports?q=${patient.code}`, { cookie: lab }))).json();
    assert.equal(byCode.total, 1);
    const byStatus = await (await reportsGet(ctx(env, "/api/staff/lab-reports?status=pending", { cookie: lab }))).json();
    assert.equal(byStatus.total, 0);
  } finally {
    wa.restore();
  }
});

test("lab report to an unverified mobile is held back with a clear reason, then sent after verification", async () => {
  const wa = fakeWhatsApp();
  try {
    const env = makeEnv(META);
    const { lab, reception } = await setupClinic(env);
    const patient = (await (await patientsPost(ctx(env, "/api/staff/patients", { method: "POST", cookie: lab, body: json({ name: "Unverified Person", phone: "9822223333" }) }))).json()).patient;
    const id = (await (await reportsPost(ctx(env, "/api/staff/lab-reports", { method: "POST", cookie: lab, body: json({ patientId: patient.id, testName: "LFT" }) }))).json()).report.id;
    await filePut(ctx(env, `/api/staff/lab-reports/${id}/file`, { method: "PUT", cookie: lab, body: tinyPdf(), headers: { "Content-Type": "application/pdf" } }, { id }));
    const ready = await (await reportPatch(ctx(env, `/api/staff/lab-reports/${id}`, { method: "PATCH", cookie: lab, body: json({ status: "ready" }) }, { id }))).json();
    assert.equal(ready.send.status, "failed");
    assert.match(ready.send.error, /not verified/);
    assert.equal(ready.report.deliveryStatus, "failed", "ready report can still show a failed delivery");
    assert.equal(wa.calls.length, 0, "nothing sent to an unverified number");

    await patientPatch(ctx(env, `/api/staff/patients/${patient.id}`, { method: "PATCH", cookie: reception, body: json({ phoneVerified: true }) }, { id: String(patient.id) }));
    const resend = await resendPost(ctx(env, `/api/staff/lab-reports/${id}/send`, { method: "POST", cookie: lab }, { id }));
    assert.equal(resend.status, 200);
  } finally {
    wa.restore();
  }
});

test("provider errors are recorded as Failed with the provider's reason", async () => {
  const wa = fakeWhatsApp({ fail: true });
  try {
    const env = makeEnv(META);
    const { reception } = await setupClinic(env);
    const b = await (await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: walkIn() }) }))).json();
    assert.equal(b.notification.sent, false);
    const log = await (await notesGet(ctx(env, "/api/staff/notifications", { cookie: reception }))).json();
    assert.equal(log.notifications[0].status, "failed");
    assert.match(log.notifications[0].error, /not in allowed list/);
  } finally {
    wa.restore();
  }
});

test("owner summary and statistics come from the database; no Helpline line", async () => {
  const env = makeEnv();
  const { owner, reception, lab } = await setupClinic(env);
  const { date, slots } = bookableSlot();
  for (const [i, name] of ["A One", "B Two", "C Three"].entries()) {
    await statePost(
      ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "upsert_appointment", appointment: walkIn({ token: `EP-S${i}-W`, patientName: name, patientPhone: `98000000${i}0`, time: slots[i], date }) }) }),
    );
  }
  await statePost(ctx(env, "/api/admin/state", { method: "POST", cookie: reception, body: json({ op: "update_appointment_status", token: "EP-S0-W", status: "completed" }) }));
  const p = (await (await patientsPost(ctx(env, "/api/staff/patients", { method: "POST", cookie: lab, body: json({ name: "Lab Only", phone: "9811000000", verified: true }) }))).json()).patient;
  const rid = (await (await reportsPost(ctx(env, "/api/staff/lab-reports", { method: "POST", cookie: lab, body: json({ patientId: p.id, testName: "KFT" }) }))).json()).report.id;
  await filePut(ctx(env, `/api/staff/lab-reports/${rid}/file`, { method: "PUT", cookie: lab, body: tinyPdf(), headers: { "Content-Type": "application/pdf" } }, { id: rid }));

  const s = await (await summaryGet(ctx(env, `/api/staff/summary?date=${date}`, { cookie: owner }))).json();
  assert.equal(s.stats.appointmentsBooked, 3);
  assert.equal(s.stats.completedAppointments, 1);
  assert.equal(s.stats.pendingAppointments, 2);
  assert.equal(s.stats.totalPatients, 3);
  assert.ok(s.text.startsWith("*ETERNAL POLYCLINIC*"));
  assert.ok(s.text.includes("*DAILY ACTIVITY SUMMARY*"));
  assert.ok(!/helpline/i.test(s.text));

  const today = clinicClock(new Date()).dateKey;
  const t = await (await summaryGet(ctx(env, `/api/staff/summary?date=${today}`, { cookie: owner }))).json();
  assert.equal(t.stats.reportsUploaded, 1);
  assert.equal(t.stats.reportsPending, 1);
  assert.equal(t.stats.newRegistrations, 4);

  const stats = await (await statsGet(ctx(env, "/api/staff/stats", { cookie: owner }))).json();
  assert.equal(stats.totals.totalPatients, 4);
  assert.equal(stats.totals.totalAppointments, 3);
  assert.equal(stats.totals.totalReports, 1);
  assert.equal(stats.totals.pendingReports, 1);
  assert.equal(stats.totals.todayRegistrations, 4);
  assert.equal(stats.daily.length, 30);
  assert.equal(stats.weekly.length, 12);
  assert.equal(stats.monthly.length, 12);
  assert.equal(stats.daily.at(-1).registrations, 4);
});

test("existing register is imported into the patient database once, without sending old confirmations", async () => {
  const wa = fakeWhatsApp();
  try {
    const env = makeEnv(META);
    const driver = resolveStorageDriver(env)!;
    const old = walkIn({ token: "EP-OLD-01", date: "2026-10-01", createdAt: Date.parse("2026-10-01T05:00:00Z"), status: "completed" });
    await driver.put("ep:clinic_state_v1", JSON.stringify({ updatedAt: 1, appointments: [old], deletedTokens: {}, doctorStatuses: {}, overrides: {}, customDoctors: [] }));
    const cookie = await createSessionCookie(driver, env, true);
    await stateGet(ctx(env, "/api/admin/state", { cookie: cookie.split(";")[0] }));
    await stateGet(ctx(env, "/api/admin/state", { cookie: cookie.split(";")[0] }));
    const { owner } = await setupClinic(env);
    const found = await (await patientsGet(ctx(env, "/api/staff/patients?q=Tariq", { cookie: owner }))).json();
    assert.equal(found.total, 1);
    assert.equal(found.patients[0].visitCount, 1);
    assert.equal(wa.calls.length, 0, "no messages for past appointments");
  } finally {
    wa.restore();
  }
});

test("checkPdf accepts real PDFs and rejects junk, truncated and oversized files", () => {
  assert.equal(checkPdf(new Uint8Array(tinyPdf())), null);
  assert.match(checkPdf(new TextEncoder().encode("%PDF-1.4" + "x".repeat(2000)))!, /incomplete/);
  assert.match(checkPdf(new Uint8Array(500))!, /too small/);
  assert.match(checkPdf(new Uint8Array(11 * 1024 * 1024))!, /larger than 10 MB/);
});
