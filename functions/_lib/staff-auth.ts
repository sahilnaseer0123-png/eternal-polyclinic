// Staff accounts and role-based access for the dashboard.
//
// Roles:
//   owner     everything, including staff accounts and owner reports
//   reception patients, appointments, doctors and availability, notifications, statistics
//   lab       lab reports (and the patient lookup needed to file one); nothing else
//
// Sign-in: username + password (PBKDF2-SHA256, 100k iterations, per-user salt), 5 wrong tries lock the
// account for 15 minutes. Session: HttpOnly, SameSite=Strict cookie signed with the clinic's secret and
// tied to the account's session_version, so a password reset or deactivation signs that person out everywhere.
//
// Migration from the old shared PIN: until the first account exists, the PIN still opens the dashboard
// (old screens only) and lets the owner create the first owner account. After that the PIN stops working.

import {
  constantTimeEqual,
  getSigningSecret,
  hmacSha256Hex,
  parseCookie,
  randomHex,
  resolveStorageDriver,
  toHex,
  verifyRequestSession,
  type CfPagesContext,
  type CloudEnv,
} from "./clinic-store";
import { audit, ensureSchema, type SqlDatabase } from "./db";

export type StaffRole = "owner" | "reception" | "lab";

export type StaffAccount = {
  id: number;
  username: string;
  displayName: string;
  role: StaffRole;
  active: boolean;
};

type StaffRow = {
  id: number;
  username: string;
  display_name: string;
  role: StaffRole;
  pass_salt: string;
  pass_hash: string;
  pass_iter: number;
  active: number;
  session_version: number;
  failed_logins: number;
  locked_until: number | null;
};

export const STAFF_COOKIE = "ep_staff_session";
const SESSION_TTL_SECONDS = 14 * 60 * 60;
const PBKDF2_ITERATIONS = 100_000; // Cloudflare Workers' maximum
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Owner",
  reception: "Reception",
  lab: "Lab",
};

function toAccount(r: StaffRow): StaffAccount {
  return { id: r.id, username: r.username, displayName: r.display_name, role: r.role, active: r.active === 1 };
}

async function pbkdf2Hex(password: string, saltHex: string, iterations: number): Promise<string> {
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return toHex(new Uint8Array(bits));
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 128) return "Password is too long.";
  if (/^\d+$/.test(pw)) return "Use letters as well as numbers.";
  return null;
}

export function validateUsername(u: string): string | null {
  if (!/^[a-z0-9._-]{3,32}$/i.test(u)) return "Username: 3–32 letters, numbers, dots, dashes or underscores.";
  return null;
}

export async function staffCount(db: SqlDatabase): Promise<number> {
  await ensureSchema(db);
  const row = await db.prepare("SELECT COUNT(*) AS n FROM staff").first<{ n: number }>();
  return row?.n ?? 0;
}

export async function createStaff(
  db: SqlDatabase,
  input: { username: string; displayName: string; role: StaffRole; password: string },
  createdBy: number | null,
): Promise<StaffAccount> {
  await ensureSchema(db);
  const salt = randomHex(16);
  const hash = await pbkdf2Hex(input.password, salt, PBKDF2_ITERATIONS);
  const row = await db
    .prepare(
      `INSERT INTO staff (username, display_name, role, pass_salt, pass_hash, pass_iter, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) RETURNING *`,
    )
    .bind(input.username.trim().toLowerCase(), input.displayName.trim(), input.role, salt, hash, PBKDF2_ITERATIONS, Date.now())
    .first<StaffRow>();
  if (!row) throw new Error("Could not create account");
  await audit(db, createdBy, "staff.create", `staff:${row.id}`, `${row.username} (${row.role})`);
  return toAccount(row);
}

export async function setStaffPassword(db: SqlDatabase, staffId: number, password: string): Promise<void> {
  const salt = randomHex(16);
  const hash = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  await db
    .prepare(
      `UPDATE staff SET pass_salt = ?1, pass_hash = ?2, pass_iter = ?3, session_version = session_version + 1,
       failed_logins = 0, locked_until = NULL WHERE id = ?4`,
    )
    .bind(salt, hash, PBKDF2_ITERATIONS, staffId)
    .run();
}

export async function listStaff(db: SqlDatabase): Promise<(StaffAccount & { lastLoginAt: number | null; createdAt: number })[]> {
  await ensureSchema(db);
  const { results } = await db
    .prepare("SELECT * FROM staff ORDER BY active DESC, role, display_name")
    .all<StaffRow & { last_login_at: number | null; created_at: number }>();
  return results.map((r) => ({ ...toAccount(r), lastLoginAt: r.last_login_at, createdAt: r.created_at }));
}

export type LoginResult = { ok: true; staff: StaffAccount; cookie: string } | { ok: false; error: string };

export async function loginStaff(
  db: SqlDatabase,
  env: CloudEnv,
  username: string,
  password: string,
  isHttps: boolean,
): Promise<LoginResult> {
  await ensureSchema(db);
  const generic = "Wrong username or password.";
  const row = await db
    .prepare("SELECT * FROM staff WHERE username = ?1")
    .bind(username.trim().toLowerCase())
    .first<StaffRow>();
  if (!row || row.active !== 1) {
    // Spend the same time as a real check so usernames can't be probed by timing
    await pbkdf2Hex(password || "x", "00".repeat(16), PBKDF2_ITERATIONS);
    return { ok: false, error: generic };
  }
  const now = Date.now();
  if (row.locked_until && row.locked_until > now) {
    const mins = Math.ceil((row.locked_until - now) / 60000);
    return { ok: false, error: `Too many wrong tries. Try again in ${mins} minute${mins > 1 ? "s" : ""}, or ask the owner to reset your password.` };
  }
  const candidate = await pbkdf2Hex(password, row.pass_salt, row.pass_iter);
  if (!constantTimeEqual(candidate, row.pass_hash)) {
    const failed = row.failed_logins + 1;
    await db
      .prepare("UPDATE staff SET failed_logins = ?1, locked_until = ?2 WHERE id = ?3")
      .bind(failed >= MAX_FAILED ? 0 : failed, failed >= MAX_FAILED ? now + LOCK_MS : null, row.id)
      .run();
    if (failed >= MAX_FAILED) await audit(db, row.id, "staff.locked", `staff:${row.id}`);
    return { ok: false, error: generic };
  }
  await db
    .prepare("UPDATE staff SET failed_logins = 0, locked_until = NULL, last_login_at = ?1 WHERE id = ?2")
    .bind(now, row.id)
    .run();
  await audit(db, row.id, "staff.login", `staff:${row.id}`);
  return { ok: true, staff: toAccount(row), cookie: await createStaffCookie(env, row, isHttps) };
}

async function signingSecret(env: CloudEnv): Promise<string> {
  const driver = resolveStorageDriver(env);
  if (driver) return getSigningSecret(driver, env);
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 16) return env.SESSION_SECRET;
  throw new Error("No signing secret available");
}

async function createStaffCookie(env: CloudEnv, row: Pick<StaffRow, "id" | "session_version">, isHttps: boolean): Promise<string> {
  const secret = await signingSecret(env);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${row.id}.${row.session_version}.${exp}.${randomHex(8)}`;
  const sig = await hmacSha256Hex(secret, `staff:${payload}`);
  return `${STAFF_COOKIE}=${payload}.${sig}; HttpOnly;${isHttps ? " Secure;" : ""} SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearStaffCookie(isHttps: boolean): string {
  return `${STAFF_COOKIE}=; HttpOnly;${isHttps ? " Secure;" : ""} SameSite=Strict; Path=/; Max-Age=0`;
}

/** The signed-in staff member for this request, or null. Checks signature, expiry, account active, session version. */
export async function staffFromRequest(request: Request, env: CloudEnv): Promise<StaffAccount | null> {
  const db = env.EP_SQL;
  if (!db) return null;
  const raw = parseCookie(request.headers.get("Cookie"), STAFF_COOKIE);
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 5) return null;
  const [idStr, verStr, expStr, nonce, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  let secret: string;
  try {
    secret = await signingSecret(env);
  } catch {
    return null;
  }
  const expected = await hmacSha256Hex(secret, `staff:${idStr}.${verStr}.${expStr}.${nonce}`);
  if (!constantTimeEqual(sig, expected)) return null;
  await ensureSchema(db);
  const row = await db.prepare("SELECT * FROM staff WHERE id = ?1").bind(Number(idStr)).first<StaffRow>();
  if (!row || row.active !== 1 || row.session_version !== Number(verStr)) return null;
  return toAccount(row);
}

export type Access =
  | { ok: true; staff: StaffAccount | null; legacy: boolean }
  | { ok: false; status: number; error: string };

/**
 * Who may call this endpoint. `roles` lists the staff roles allowed.
 * `allowLegacyPin`: the old shared-PIN session is accepted only while no staff account exists yet
 * (or when the clinic database isn't connected), and only for the existing OPD screens.
 */
export async function authorize(
  context: CfPagesContext,
  roles: StaffRole[],
  options: { allowLegacyPin?: boolean; requireDatabase?: boolean } = {},
): Promise<Access> {
  const { request, env } = context;
  if (options.requireDatabase && !env.EP_SQL) {
    return { ok: false, status: 503, error: "The clinic records database (EP_SQL) is not connected yet." };
  }
  const staff = await staffFromRequest(request, env);
  if (staff) {
    if (!roles.includes(staff.role)) {
      return { ok: false, status: 403, error: `Your ${ROLE_LABELS[staff.role]} account can't open this section.` };
    }
    return { ok: true, staff, legacy: false };
  }
  if (options.allowLegacyPin) {
    const driver = resolveStorageDriver(env);
    const noAccountsYet = !env.EP_SQL || (await staffCount(env.EP_SQL)) === 0;
    if (driver && noAccountsYet && (await verifyRequestSession(request, driver, env))) {
      return { ok: true, staff: null, legacy: true };
    }
  }
  return { ok: false, status: 401, error: "Please sign in." };
}

export function sanitizeRole(v: unknown): StaffRole | null {
  return v === "owner" || v === "reception" || v === "lab" ? v : null;
}
