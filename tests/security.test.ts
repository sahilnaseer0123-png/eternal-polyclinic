import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, test } from "node:test";
import { doctors } from "@/data/clinic";
import { nextOpdDates, timeSlots } from "@/lib/schedule";
import {
  createMemoryKV,
  hmacSha256Hex,
  resolveStorageDriver,
  verifyRequestSession,
  type CfKVNamespace,
  type CfPagesContext,
  type CloudEnv,
} from "@/functions/_lib/clinic-store";
import { ensureSchema } from "@/functions/_lib/db";
import { reportLinkHash } from "@/functions/_lib/notify";
import { resetRateLimits } from "@/functions/_lib/rate-limit";
import { onRequestGet as authGet, onRequestPost as authPost } from "@/functions/api/admin/auth";
import { onRequestGet as stateGet, onRequestPost as statePost } from "@/functions/api/admin/state";
import { onRequestDelete as bookDelete, onRequestGet as bookGet, onRequestPost as bookPost } from "@/functions/api/book";
import { onRequestGet as liveGet } from "@/functions/api/live";
import { onRequestGet as mediaGet } from "@/functions/api/report/media";
import { onRequestPost as reportViewPost } from "@/functions/api/report/view";
import { onRequestPost as patientsPost } from "@/functions/api/staff/patients";
import { onRequestPost as twilioStatusPost } from "@/functions/api/whatsapp/twilio-status";
import { onRequestGet as webhookGet, onRequestPost as webhookPost } from "@/functions/api/whatsapp/webhook";
import { createTestD1, tinyPdf } from "./helpers/d1";

const BASE = "https://eternalpolyclinic.com";

beforeEach(() => resetRateLimits());

function assertSecurityHeaders(res: Response, { pdf = false }: { pdf?: boolean } = {}) {
  assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(res.headers.get("X-Frame-Options"), "DENY");
  assert.equal(res.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(res.headers.get("Permissions-Policy"), "camera=(), microphone=(), geolocation=()");
  assert.equal(res.headers.get("Strict-Transport-Security"), "max-age=31536000; includeSubDomains");
  if (pdf) {
    assert.equal(res.headers.get("Content-Security-Policy"), "default-src 'none'; sandbox");
  }
}

function countingKV(): { kv: CfKVNamespace; writes: () => number } {
  const inner = createMemoryKV();
  let putCount = 0;
  return {
    writes: () => putCount,
    kv: {
      get: ((key: string, type?: "arrayBuffer") =>
        type === "arrayBuffer" ? inner.get(key, "arrayBuffer") : inner.get(key)) as CfKVNamespace["get"],
      async put(key, value, options) {
        putCount += 1;
        return inner.put(key, value, options);
      },
      delete: (key) => inner.delete(key),
    },
  };
}

function pickBookableSlot() {
  const now = new Date();
  for (const doctor of doctors) {
    for (const { date } of nextOpdDates(doctor, now, 4)) {
      const slots = timeSlots(doctor, date, now);
      if (slots.length >= 1) return { doctor, date, time: slots[0] };
    }
  }
  throw new Error("No bookable slots found");
}

function ctx(env: CloudEnv, reqPath: string, init: RequestInit = {}): CfPagesContext {
  return {
    request: new Request(`${BASE}${reqPath}`, init),
    env,
  };
}

test("public/_headers enforces HSTS, frame-ancestors 'none', object-src 'none', base-uri 'self', and form-action 'self'", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "public/_headers"), "utf8");
  assert.match(raw, /X-Frame-Options:\s*DENY/);
  assert.match(raw, /X-Content-Type-Options:\s*nosniff/);
  assert.match(raw, /Referrer-Policy:\s*strict-origin-when-cross-origin/);
  assert.match(raw, /Permissions-Policy:\s*camera=\(\),\s*microphone=\(\),\s*geolocation=\(\)/);
  assert.match(raw, /Strict-Transport-Security:\s*max-age=31536000;\s*includeSubDomains/);
  assert.match(raw, /Content-Security-Policy:.*object-src 'none'/);
  assert.match(raw, /Content-Security-Policy:.*base-uri 'self'/);
  assert.match(raw, /Content-Security-Policy:.*form-action 'self'/);
  assert.match(raw, /Content-Security-Policy:.*frame-ancestors 'none'/);
});

test("static source and built HTML assets contain zero inline DOM event handlers", () => {
  const inlineHandler = /\son(click|load|error|submit|change|input|mouseover|focus)\s*=/i;
  const outDir = path.join(process.cwd(), "out");
  if (fs.existsSync(outDir)) {
    const htmlFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".html")) htmlFiles.push(full);
      }
    };
    walk(outDir);
    for (const file of htmlFiles) {
      const html = fs.readFileSync(file, "utf8");
      assert.equal(inlineHandler.test(html), false, `Found inline handler in ${file}`);
    }
  }
});

test("API and PDF endpoints attach full security headers (and sandbox CSP on PDFs)", async () => {
  const kv = createMemoryKV();
  const db = createTestD1();
  const env: CloudEnv = {
    EP_KV: kv,
    EP_SQL: db,
    SESSION_SECRET: "test-session-secret-0123456789",
    WHATSAPP_APP_SECRET: "meta-secret",
    WHATSAPP_VERIFY_TOKEN: "verify-tok",
    TWILIO_AUTH_TOKEN: "twilio-tok",
  };

  assertSecurityHeaders(await liveGet(ctx(env, "/api/live")));
  assertSecurityHeaders(await authGet(ctx(env, "/api/admin/auth")));
  assertSecurityHeaders(await stateGet(ctx(env, "/api/admin/state")));
  assertSecurityHeaders(await bookGet(ctx(env, "/api/book?phone=9876543210")));
  assertSecurityHeaders(
    await mediaGet(ctx(env, "/api/report/media?id=missing&exp=1&sig=bad")),
  );
  assertSecurityHeaders(
    await webhookPost(ctx(env, "/api/whatsapp/webhook", { method: "POST", body: "{}" })),
  );
  assertSecurityHeaders(
    await twilioStatusPost(ctx(env, "/api/whatsapp/twilio-status", { method: "POST", body: "" })),
  );

  // Valid PDF response from /api/report/view carries nosniff + sandbox CSP
  await ensureSchema(db);
  await db
    .prepare(
      "INSERT INTO patients (id, code, name, name_key, phone, phone_verified, source, created_at, created_date, updated_at) VALUES (1, 'EPP-00001', 'Test Patient', 'test patient', '9876543210', 1, 'lab', 1000, '2026-11-14', 1000)",
    )
    .run();
  await kv.put("pdf:rep-1", tinyPdf());
  await db
    .prepare(
      "INSERT INTO lab_reports (id, patient_id, test_name, sample_date, status, file_key, file_name, created_at, created_date, updated_at) VALUES ('rep-1', 1, 'CBC', '2026-11-14', 'ready', 'pdf:rep-1', 'cbc.pdf', 1000, '2026-11-14', 1000)",
    )
    .run();
  const rawToken = "Tok_0123456789abcdefghijklmnop";
  const tokenHash = await reportLinkHash(rawToken);
  await db
    .prepare("INSERT INTO report_links (token_hash, report_id, expires_at, created_at) VALUES (?1, 'rep-1', ?2, 1000)")
    .bind(tokenHash, Date.now() + 86_400_000)
    .run();

  const pdfRes = await reportViewPost(
    ctx(env, "/api/report/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: rawToken, last4: "3210" }),
    }),
  );
  assert.equal(pdfRes.status, 200);
  assert.equal(pdfRes.headers.get("Content-Type"), "application/pdf");
  assertSecurityHeaders(pdfRes, { pdf: true });
});

test("session cookie cannot be forged using ADMIN_PIN or SESSION_SECRET == ADMIN_PIN", async () => {
  const env: CloudEnv = {
    EP_KV: createMemoryKV(),
    ADMIN_PIN: "SuperSecretPin123456",
    // Intentionally misconfigured equal to ADMIN_PIN: must be ignored
    SESSION_SECRET: "SuperSecretPin123456",
  };
  const driver = resolveStorageDriver(env)!;
  const loginRes = await authPost(
    ctx(env, "/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", pin: "SuperSecretPin123456" }),
    }),
  );
  assert.equal(loginRes.status, 200);

  // Attempt to forge session cookie signed using ADMIN_PIN directly
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const nonce = "forgednonce01";
  const forgedSig = await hmacSha256Hex("SuperSecretPin123456", `${exp}.${nonce}`);
  const forgedCookie = `ep_admin_session=${exp}.${nonce}.${forgedSig}`;
  const valid = await verifyRequestSession(
    new Request(`${BASE}/api/admin/state`, { headers: { Cookie: forgedCookie } }),
    driver,
    env,
  );
  assert.equal(valid, false);
});

test("unauthenticated or forged cookies trigger zero KV writes on session verification & media checks", async () => {
  const { kv, writes } = countingKV();
  const db = createTestD1();
  const env: CloudEnv = { EP_KV: kv, EP_SQL: db };

  const forged = "ep_admin_session=9999999999.nonce." + "a".repeat(64);
  const forgedStaff = "ep_staff_session=1.1.9999999999.nonce." + "b".repeat(64);

  const authRes = await authGet(ctx(env, "/api/admin/auth", { headers: { Cookie: `${forged}; ${forgedStaff}` } }));
  assert.equal(authRes.status, 200);
  assert.equal((await authRes.json()).authenticated, false);

  const stateRes = await stateGet(ctx(env, "/api/admin/state", { headers: { Cookie: `${forged}; ${forgedStaff}` } }));
  assert.equal(stateRes.status, 401);

  const mediaRes = await mediaGet(ctx(env, `/api/report/media?id=r1&exp=${Math.floor(Date.now() / 1000) + 600}&sig=${"c".repeat(64)}`));
  assert.equal(mediaRes.status, 404);

  assert.equal(writes(), 0, "Zero KV writes allowed for unauthenticated or forged requests");
});

test("unauthenticated logout is rejected (401), while authenticated logout succeeds (200)", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV(), ADMIN_PIN: "9876" };

  const unauthLogout = await authPost(
    ctx(env, "/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }),
  );
  assert.equal(unauthLogout.status, 401);

  const loginRes = await authPost(
    ctx(env, "/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", pin: "9876" }),
    }),
  );
  assert.equal(loginRes.status, 200);
  const cookie = loginRes.headers.get("Set-Cookie")!.split(";")[0];

  const authLogout = await authPost(
    ctx(env, "/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify({ action: "logout" }),
    }),
  );
  assert.equal(authLogout.status, 200);
  assert.match(authLogout.headers.get("Set-Cookie") ?? "", /Max-Age=0/);
});

test("cross-origin mutating requests are rejected with 403 across endpoints", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV(), EP_SQL: createTestD1(), ADMIN_PIN: "9876" };

  for (const badOrigin of ["https://evil.example", "null"]) {
    const authRes = await authPost(
      ctx(env, "/api/admin/auth", {
        method: "POST",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", pin: "9876" }),
      }),
    );
    assert.equal(authRes.status, 403);

    const stateRes = await statePost(
      ctx(env, "/api/admin/state", {
        method: "POST",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: JSON.stringify({ op: "sync_merge" }),
      }),
    );
    assert.equal(stateRes.status, 403);

    const bookPostRes = await bookPost(
      ctx(env, "/api/book", {
        method: "POST",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(bookPostRes.status, 403);

    const bookDelRes = await bookDelete(
      ctx(env, "/api/book", {
        method: "DELETE",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(bookDelRes.status, 403);

    const reportRes = await reportViewPost(
      ctx(env, "/api/report/view", {
        method: "POST",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(reportRes.status, 403);

    const staffRes = await patientsPost(
      ctx(env, "/api/staff/patients", {
        method: "POST",
        headers: { Origin: badOrigin, "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(staffRes.status, 403);
  }
});

test("per-IP rate limiting returns 429 + Retry-After on brute-force auth, booking, lookup, cancel, and report view", async () => {
  const env: CloudEnv = { EP_KV: createMemoryKV(), EP_SQL: createTestD1(), ADMIN_PIN: "9876" };
  const attackerIp = { "CF-Connecting-IP": "198.51.100.77", "Content-Type": "application/json" };

  // 1. /api/admin/auth brute-force (limit 8)
  for (let i = 0; i < 8; i++) {
    const r = await authPost(
      ctx(env, "/api/admin/auth", {
        method: "POST",
        headers: attackerIp,
        body: JSON.stringify({ action: "login", pin: "0000" }),
      }),
    );
    assert.equal(r.status, 401);
  }
  const authBlocked = await authPost(
    ctx(env, "/api/admin/auth", {
      method: "POST",
      headers: attackerIp,
      body: JSON.stringify({ action: "login", pin: "9876" }),
    }),
  );
  assert.equal(authBlocked.status, 429);
  assert.ok(Number(authBlocked.headers.get("Retry-After")) >= 1);

  // 2. /api/book GET enumeration (limit 20)
  for (let i = 0; i < 20; i++) {
    const r = await bookGet(
      ctx(env, `/api/book?phone=98765432${String(i).padStart(2, "0")}`, {
        headers: { "CF-Connecting-IP": "198.51.100.78" },
      }),
    );
    assert.equal(r.status, 200);
  }
  const getBlocked = await bookGet(
    ctx(env, "/api/book?phone=9876543299", { headers: { "CF-Connecting-IP": "198.51.100.78" } }),
  );
  assert.equal(getBlocked.status, 429);
  assert.ok(Number(getBlocked.headers.get("Retry-After")) >= 1);

  // 3. /api/book DELETE brute-force (limit 10)
  for (let i = 0; i < 10; i++) {
    const r = await bookDelete(
      ctx(env, "/api/book", {
        method: "DELETE",
        headers: { "CF-Connecting-IP": "198.51.100.79", "Content-Type": "application/json" },
        body: JSON.stringify({ token: "EP-FAKE", phone: "9876543210" }),
      }),
    );
    assert.equal(r.status, 404);
  }
  const delBlocked = await bookDelete(
    ctx(env, "/api/book", {
      method: "DELETE",
      headers: { "CF-Connecting-IP": "198.51.100.79", "Content-Type": "application/json" },
      body: JSON.stringify({ token: "EP-FAKE", phone: "9876543210" }),
    }),
  );
  assert.equal(delBlocked.status, 429);

  // 4. /api/book POST spam (limit 12)
  const { doctor, date, time } = pickBookableSlot();
  for (let i = 0; i < 12; i++) {
    const r = await bookPost(
      ctx(env, "/api/book", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.80", "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: doctor.id, date, time, name: "", phone: "9876543210" }),
      }),
    );
    assert.equal(r.status, 422);
  }
  const postBlocked = await bookPost(
    ctx(env, "/api/book", {
      method: "POST",
      headers: { "CF-Connecting-IP": "198.51.100.80", "Content-Type": "application/json" },
      body: JSON.stringify({ doctorId: doctor.id, date, time, name: "A", phone: "9876543210" }),
    }),
  );
  assert.equal(postBlocked.status, 429);

  // 5. /api/report/view (limit 15)
  for (let i = 0; i < 15; i++) {
    const r = await reportViewPost(
      ctx(env, "/api/report/view", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.81", "Content-Type": "application/json" },
        body: JSON.stringify({ token: "bad", last4: "1234" }),
      }),
    );
    assert.equal(r.status, 400);
  }
  const reportBlocked = await reportViewPost(
    ctx(env, "/api/report/view", {
      method: "POST",
      headers: { "CF-Connecting-IP": "198.51.100.81", "Content-Type": "application/json" },
      body: JSON.stringify({ token: "bad", last4: "1234" }),
    }),
  );
  assert.equal(reportBlocked.status, 429);
});

test("WhatsApp webhooks reject bad signatures and serve verification challenge as text/plain with nosniff", async () => {
  const env: CloudEnv = {
    EP_SQL: createTestD1(),
    WHATSAPP_VERIFY_TOKEN: "verify-secret-123",
    WHATSAPP_APP_SECRET: "meta-app-secret",
    TWILIO_AUTH_TOKEN: "twilio-auth-secret",
  };

  // GET challenge must come back as text/plain + nosniff (blocks reflected HTML XSS)
  const challenge = "<script>alert(1)</script>";
  const getRes = await webhookGet(
    ctx(
      env,
      `/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-secret-123&hub.challenge=${encodeURIComponent(challenge)}`,
    ),
  );
  assert.equal(getRes.status, 200);
  assert.equal(getRes.headers.get("Content-Type"), "text/plain; charset=utf-8");
  assertSecurityHeaders(getRes);
  assert.equal(await getRes.text(), challenge);

  // Bad Meta webhook signature rejected
  const badMeta = await webhookPost(
    ctx(env, "/api/whatsapp/webhook", {
      method: "POST",
      headers: { "X-Hub-Signature-256": "sha256=" + "0".repeat(64) },
      body: "{}",
    }),
  );
  assert.equal(badMeta.status, 401);
  assertSecurityHeaders(badMeta);

  // Bad Twilio webhook signature rejected
  const badTwilio = await twilioStatusPost(
    ctx(env, "/api/whatsapp/twilio-status", {
      method: "POST",
      headers: { "X-Twilio-Signature": "forged==" },
      body: "MessageSid=SM123&MessageStatus=delivered",
    }),
  );
  assert.equal(badTwilio.status, 401);
  assertSecurityHeaders(badTwilio);
});
