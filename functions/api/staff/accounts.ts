// Staff accounts (owner only).
// GET   /api/staff/accounts                       list
// POST  /api/staff/accounts { username, displayName, role, password }
// PATCH /api/staff/accounts { id, role?, active?, password? }
//       Deactivating or resetting a password signs that person out of every device.
//       The last active owner can't be removed or demoted, and owners can't deactivate themselves.

import { jsonResponse, type CfPagesContext } from "../../_lib/clinic-store";
import { audit } from "../../_lib/db";
import { bad, readJson, staffGate } from "../../_lib/http";
import { createStaff, listStaff, sanitizeRole, setStaffPassword, validatePassword, validateUsername } from "../../_lib/staff-auth";

export async function onRequestGet(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner"]);
  if (gate instanceof Response) return gate;
  return jsonResponse({ ok: true, staff: await listStaff(gate.db) });
}

export async function onRequestPost(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner"]);
  if (gate instanceof Response) return gate;
  const body = await readJson<{ username?: string; displayName?: string; role?: string; password?: string }>(context.request);
  if (!body) return bad("Invalid request.");
  const username = (body.username ?? "").trim().toLowerCase();
  const role = sanitizeRole(body.role);
  const problem =
    validateUsername(username) ??
    ((body.displayName ?? "").trim() ? null : "Enter the person's name.") ??
    (role ? null : "Choose a role.") ??
    validatePassword(body.password ?? "");
  if (problem) return bad(problem);
  const exists = await gate.db.prepare("SELECT id FROM staff WHERE username = ?1").bind(username).first();
  if (exists) return bad("That username is taken.", 409);
  const account = await createStaff(gate.db, { username, displayName: body.displayName!, role: role!, password: body.password! }, gate.staff.id);
  return jsonResponse({ ok: true, account }, 201);
}

export async function onRequestPatch(context: CfPagesContext): Promise<Response> {
  const gate = await staffGate(context, ["owner"]);
  if (gate instanceof Response) return gate;
  const { db, staff } = gate;
  const body = await readJson<{ id?: number; role?: string; active?: boolean; password?: string }>(context.request);
  const id = Number(body?.id);
  const target = await db.prepare("SELECT id, role, active, username FROM staff WHERE id = ?1").bind(id).first<{ id: number; role: string; active: number; username: string }>();
  if (!body || !target) return bad("Account not found.", 404);

  const owners = (await db.prepare("SELECT COUNT(*) AS n FROM staff WHERE role = 'owner' AND active = 1").first<{ n: number }>())?.n ?? 0;
  const losingOwner =
    target.role === "owner" && target.active === 1 && ((body.role && body.role !== "owner") || body.active === false);
  if (losingOwner && owners <= 1) return bad("Keep at least one active owner account.");
  if (body.active === false && target.id === staff.id) return bad("You can't switch off your own account.");

  if (body.role !== undefined) {
    const role = sanitizeRole(body.role);
    if (!role) return bad("Choose a role.");
    await db.prepare("UPDATE staff SET role = ?1, session_version = session_version + 1 WHERE id = ?2").bind(role, id).run();
    await audit(db, staff.id, "staff.role", `staff:${id}`, role);
  }
  if (body.active !== undefined) {
    await db
      .prepare("UPDATE staff SET active = ?1, session_version = session_version + 1, failed_logins = 0, locked_until = NULL WHERE id = ?2")
      .bind(body.active ? 1 : 0, id)
      .run();
    await audit(db, staff.id, body.active ? "staff.activate" : "staff.deactivate", `staff:${id}`);
  }
  if (body.password !== undefined) {
    const problem = validatePassword(body.password);
    if (problem) return bad(problem);
    await setStaffPassword(db, id, body.password);
    await audit(db, staff.id, "staff.reset_password", `staff:${id}`);
  }
  return jsonResponse({ ok: true, staff: await listStaff(db) });
}
