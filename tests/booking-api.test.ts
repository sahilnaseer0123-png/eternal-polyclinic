import { test } from "node:test";
import assert from "node:assert/strict";
import { doctors } from "@/data/clinic";
import { nextOpdDates, timeSlots } from "@/lib/schedule";
import { createMemoryKV, type CloudEnv } from "@/functions/_lib/clinic-store";
import { buildPatientConfirmationMessage } from "@/functions/_lib/whatsapp";
import { onRequestDelete, onRequestGet, onRequestPost } from "@/functions/api/book";

const URL_BASE = "https://eternalpolyclinic.com/api/book";

function pickSlots() {
  const now = new Date();
  for (const doctor of doctors) {
    for (const { date } of nextOpdDates(doctor, now, 4)) {
      const slots = timeSlots(doctor, date, now);
      if (slots.length >= 2) return { doctor, date, slots };
    }
  }
  throw new Error("No bookable slots in test data");
}

const post = (env: CloudEnv, body: unknown) =>
  onRequestPost({
    request: new Request(URL_BASE, { method: "POST", body: JSON.stringify(body) }),
    env,
  });

test("POST /api/book issues a token, locks the slot, rejects double booking and honeypot", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV() };
  const { doctor, date, slots } = pickSlots();
  const base = { doctorId: doctor.id, date, time: slots[0], name: "Tariq Ahmad", phone: "9876543210" };

  const ok = await post(env, base);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.ok(body.ok);
  assert.match(body.appointment.token, /^EP-/);
  assert.equal(body.appointment.status, "confirmed");
  assert.equal(body.whatsapp.sent, false);

  const taken = await post(env, { ...base, name: "Other Person", phone: "9876543211" });
  assert.equal(taken.status, 409);

  const bot = await post(env, { ...base, time: slots[1], phone: "9876543212", website: "http://spam" });
  assert.equal(bot.status, 400);
});

test("GET and DELETE /api/book look up and cancel by token + phone, freeing the slot", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV() };
  const { doctor, date, slots } = pickSlots();
  const base = { doctorId: doctor.id, date, time: slots[0], name: "Tariq Ahmad", phone: "9876543210" };
  const { appointment } = await (await post(env, base)).json();

  const found = await onRequestGet({ request: new Request(`${URL_BASE}?phone=9876543210`), env });
  assert.equal((await found.json()).appointments.length, 1);

  const wrong = await onRequestDelete({
    request: new Request(URL_BASE, {
      method: "DELETE",
      body: JSON.stringify({ token: appointment.token, phone: "9000000000" }),
    }),
    env,
  });
  assert.equal(wrong.status, 404);

  const cancelled = await onRequestDelete({
    request: new Request(URL_BASE, {
      method: "DELETE",
      body: JSON.stringify({ token: appointment.token, phone: "9876543210" }),
    }),
    env,
  });
  assert.equal(cancelled.status, 200);

  const rebook = await post(env, { ...base, name: "New Patient", phone: "9876543299" });
  assert.equal(rebook.status, 200);
});

test("booking dispatches a WhatsApp confirmation through a configured webhook", async () => {
  const calls: string[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  try {
    const env: CloudEnv = { EP_KV: createMemoryKV(), WHATSAPP_WEBHOOK_URL: "https://gateway.example/send" };
    const { doctor, date, slots } = pickSlots();
    const res = await post(env, {
      doctorId: doctor.id,
      date,
      time: slots[0],
      name: "Tariq Ahmad",
      phone: "9876543210",
    });
    const body = await res.json();
    assert.equal(body.whatsapp.sent, true);
    assert.equal(body.appointment.whatsappSent, true);
    assert.deepEqual(calls, ["https://gateway.example/send"]);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("WhatsApp confirmation names the doctor but never the speciality", () => {
  const text = buildPatientConfirmationMessage({
    token: "EP-AK1031-01",
    doctorId: "akash",
    doctorName: "Dr. Akash Bashir",
    speciality: "Psychiatry",
    date: "2026-10-31",
    time: "15:30",
    patientName: "Tariq Ahmad",
    patientPhone: "9876543210",
    type: "online",
    status: "confirmed",
    createdAt: 1,
  });
  assert.ok(text.includes("Dr. Akash Bashir"));
  assert.ok(text.includes("EP-AK1031-01"));
  assert.ok(!text.includes("Psychiatry"));
});
