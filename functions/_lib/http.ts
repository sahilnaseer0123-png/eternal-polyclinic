// Small helpers shared by the staff API endpoints.

import { getSigningSecret, jsonResponse, resolveStorageDriver, type CfPagesContext, type CloudEnv } from "./clinic-store";
import { ensureSchema, type SqlDatabase } from "./db";
import { authorize, type StaffAccount, type StaffRole } from "./staff-auth";

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function param(context: CfPagesContext, name: string): string {
  const v = context.params?.[name];
  return Array.isArray(v) ? v.join("/") : (v ?? "");
}

export function bad(error: string, status = 400): Response {
  return jsonResponse({ ok: false, error }, status);
}

/** Signs-in check + database for a staff endpoint. Returns a Response to send back on failure. */
export async function staffGate(
  context: CfPagesContext,
  roles: StaffRole[],
): Promise<{ staff: StaffAccount; db: SqlDatabase } | Response> {
  const access = await authorize(context, roles, { requireDatabase: true });
  if (!access.ok) return bad(access.error, access.status);
  if (!access.staff) return bad("Please sign in with a staff account.", 401);
  const db = context.env.EP_SQL!;
  await ensureSchema(db);
  return { staff: access.staff, db };
}

export async function secretFor(env: CloudEnv): Promise<string> {
  const driver = resolveStorageDriver(env);
  if (!driver) throw new Error("Storage not configured");
  return getSigningSecret(driver, env);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dateParam(url: URL, name: string): string | null {
  const v = url.searchParams.get(name);
  return v && DATE_RE.test(v) ? v : null;
}
