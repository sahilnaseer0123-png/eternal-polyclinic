import { test } from "node:test";
import assert from "node:assert/strict";
import { clinic, serviceActions, services } from "@/data/clinic";
import {
  applyCloudMutation,
  clinicTodayKey,
  createMemoryKV,
  resolveStorageDriver,
  type CloudEnv,
} from "@/functions/_lib/clinic-store";
import { onRequestGet as getLive } from "@/functions/api/live";
import { onRequestGet as getAuth, onRequestPost as postAuth } from "@/functions/api/admin/auth";
import { onRequestGet as getState, onRequestPost as postState } from "@/functions/api/admin/state";

function extractCookieValue(setCookieHeader: string | null): string {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  return setCookieHeader.split(";")[0];
}

test("GET /api/live reports unconfigured cleanly when no KV/D1 binding is attached", async () => {
  const res = await getLive({
    request: new Request("https://eternalpolyclinic.com/api/live"),
    env: {},
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.configured, false);
  assert.deepEqual(body.bookedSlots, []);
});

test("Admin auth rejects bad PIN, issues signed cookie on valid PIN, and rotates PIN securely", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV(), ADMIN_PIN: "9876" };

  // Wrong PIN rejected
  const badRes = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", pin: "1234" }),
    }),
    env,
  });
  assert.equal(badRes.status, 401);

  // Correct env ADMIN_PIN accepted
  const okRes = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", pin: "9876" }),
    }),
    env,
  });
  assert.equal(okRes.status, 200);
  const cookie = extractCookieValue(okRes.headers.get("Set-Cookie"));
  assert.match(cookie, /^ep_admin_session=/);

  // Verify session is recognized
  const checkRes = await getAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      headers: { Cookie: cookie },
    }),
    env,
  });
  const checkBody = await checkRes.json();
  assert.equal(checkBody.authenticated, true);
  assert.equal(checkBody.usingDefaultPin, false);

  // Rotate PIN from admin console
  const rotateRes = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ action: "change_pin", newPin: "552800" }),
    }),
    env,
  });
  assert.equal(rotateRes.status, 200);

  // Old PIN no longer works
  const oldPinAttempt = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", pin: "9876" }),
    }),
    env,
  });
  assert.equal(oldPinAttempt.status, 401);

  // New PIN works
  const newPinAttempt = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", pin: "552800" }),
    }),
    env,
  });
  assert.equal(newPinAttempt.status, 200);
});

test("/api/admin/state enforces auth, syncs without resurrecting deleted tokens, and strips PII on /api/live", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV(), ADMIN_PIN: "7788" };
  const today = clinicTodayKey();

  // Unauthenticated access blocked
  const unauth = await getState({
    request: new Request("https://eternalpolyclinic.com/api/admin/state"),
    env,
  });
  assert.equal(unauth.status, 401);

  // Login to get session cookie
  const loginRes = await postAuth({
    request: new Request("https://eternalpolyclinic.com/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ action: "login", pin: "7788" }),
    }),
    env,
  });
  const cookie = extractCookieValue(loginRes.headers.get("Set-Cookie"));

  // Save an appointment and a live delay
  const apt1 = {
    token: "EP-IM1104-01-W",
    doctorId: "imtiyaz",
    doctorName: "Dr. Imtiyaz Ahmad Sofi",
    speciality: "Urologist",
    date: today,
    time: "10:20",
    patientName: "Ghulam Mohammad",
    patientPhone: "9876543210",
    patientAddress: "Tarzoo, Sopore",
    type: "walk_in" as const,
    status: "arrived" as const,
    createdAt: 1000,
  };

  await postState({
    request: new Request("https://eternalpolyclinic.com/api/admin/state", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ op: "upsert_appointment", appointment: apt1 }),
    }),
    env,
  });

  await postState({
    request: new Request("https://eternalpolyclinic.com/api/admin/state", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({
        op: "set_doctor_status",
        doctorId: "imtiyaz",
        status: { state: "delayed", delayMinutes: 30, note: "Sangrama traffic" },
      }),
    }),
    env,
  });

  // Public /api/live shows delay + locked slot, ZERO patient PII
  const liveRes = await getLive({
    request: new Request("https://eternalpolyclinic.com/api/live"),
    env,
  });
  const liveRaw = await liveRes.text();
  assert.doesNotMatch(liveRaw, /Ghulam|9876543210|Tarzoo|EP-IM1104-01-W/);

  const liveJson = JSON.parse(liveRaw);
  assert.equal(liveJson.configured, true);
  assert.equal(liveJson.doctorStatuses.imtiyaz.state, "delayed");
  assert.equal(liveJson.doctorStatuses.imtiyaz.delayMinutes, 30);
  assert.deepEqual(liveJson.bookedSlots, [{ doctorId: "imtiyaz", date: today, time: "10:20" }]);

  // Delete token on Tablet A, then sync_merge stale list from Phone B -> deleted token stays deleted
  await postState({
    request: new Request("https://eternalpolyclinic.com/api/admin/state", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ op: "delete_appointment", token: apt1.token }),
    }),
    env,
  });

  const mergeRes = await postState({
    request: new Request("https://eternalpolyclinic.com/api/admin/state", {
      method: "POST",
      headers: { Cookie: cookie },
      body: JSON.stringify({ op: "sync_merge", appointments: [apt1] }),
    }),
    env,
  });
  const mergedBody = await mergeRes.json();
  assert.equal(mergedBody.state.appointments.length, 0);
});

test("stale doctor delays from yesterday auto-expire in clinic time", async () => {
  const driver = resolveStorageDriver({ EP_KV: createMemoryKV() })!;
  await applyCloudMutation(
    driver,
    {
      op: "set_doctor_status",
      doctorId: "akash",
      status: { state: "delayed", delayMinutes: 45, date: "2026-11-01" },
    },
    new Date("2026-11-01T06:00:00Z"),
  );

  // Next day check: yesterday's delay is pruned automatically
  const nextDayState = await applyCloudMutation(
    driver,
    { op: "sync_merge" },
    new Date("2026-11-02T06:00:00Z"),
  );
  assert.equal(nextDayState.doctorStatuses.akash, undefined);
});

test("serviceActions routes every clinic service to real clinic phone & WhatsApp lines", () => {
  assert.equal(services.length, 6);
  for (const s of services) {
    const act = serviceActions(s);
    assert.match(act.whatsappUrl, /^https:\/\/wa\.me\/91\d{10}\?text=/);
    assert.match(act.phoneHref, /^tel:\+91\d{10}$/);
    if (s.id === "lab") {
      assert.ok(act.phoneHref.includes(clinic.labTechPhone));
      assert.ok(act.whatsappUrl.includes("917780827886"));
    } else {
      assert.ok(act.phoneHref.includes(clinic.phone));
      assert.ok(act.whatsappUrl.includes(clinic.whatsapp));
    }
  }
});

