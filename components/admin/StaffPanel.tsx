"use client";

// Staff accounts (owner) and "my password" (everyone), plus the sign-in and first-owner setup forms.

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABEL, api, type StaffRole, type StaffSession } from "@/lib/staff-api";
import { EmptyRow, Modal, Notice, SectionHeader, StatusPill, fieldInput, fieldLabel, primaryBtn, smallBtn, stamp } from "./ui";

type Account = { id: number; username: string; displayName: string; role: StaffRole; active: boolean; lastLoginAt: number | null; createdAt: number };

const ROLE_HELP: Record<StaffRole, string> = {
  owner: "Everything, including staff accounts and owner reports",
  reception: "Patients, appointments, doctors, notifications, statistics",
  lab: "Lab reports only",
};

export function StaffPanel({ session }: { session: StaffSession }) {
  return (
    <div className="fade-in flex flex-col gap-5">
      {session.role === "owner" && <AccountsManager session={session} />}
      <ChangePassword />
    </div>
  );
}

function AccountsManager({ session }: { session: StaffSession }) {
  const [list, setList] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<Account | null>(null);

  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    api<{ staff: Account[] }>("/api/staff/accounts")
      .then((r) => active && setList(r.staff))
      .catch((err: Error) => active && setError(err.message || "Could not load accounts."));
    return () => {
      active = false;
    };
  }, [version]);

  async function patch(id: number, body: Record<string, unknown>, done: string) {
    setError("");
    setFlash("");
    try {
      const res = await api<{ staff: Account[] }>("/api/staff/accounts", { method: "PATCH", json: { id, ...body } });
      setList(res.staff);
      setFlash(done);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <>
      <SectionHeader
        eyebrow="Staff accounts"
        title="Who can sign in"
        desc="Give everyone their own login. Lab staff only see Lab Reports. Switching an account off signs that person out on every device."
        action={
          <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
            + Add staff member
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {flash && <Notice tone="success">{flash}</Notice>}
      <div className="card rounded-3xl p-2 sm:p-3">
        {list && list.length === 0 && <EmptyRow>No accounts.</EmptyRow>}
        <ul className="flex flex-col divide-y divide-line">
          {list?.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                <p className="font-semibold text-ink">
                  {a.displayName} <span className="font-normal text-muted">@{a.username}</span>
                  {a.id === session.id && <span className="text-muted"> (you)</span>}
                </p>
                <p className="text-xs text-muted">Last sign-in {stamp(a.lastLoginAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={a.active ? "verified" : "cancelled"} label={a.active ? "Active" : "Switched off"} />
                <select
                  aria-label={`Role for ${a.displayName}`}
                  className="min-h-10 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold"
                  value={a.role}
                  onChange={(e) => patch(a.id, { role: e.target.value }, `${a.displayName} is now ${ROLE_LABEL[e.target.value as StaffRole]}.`)}
                >
                  {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button type="button" className={smallBtn} onClick={() => setResetFor(a)}>
                  Reset password
                </button>
                {a.id !== session.id && (
                  <button
                    type="button"
                    className={smallBtn}
                    onClick={() => patch(a.id, { active: !a.active }, a.active ? `${a.displayName} switched off and signed out.` : `${a.displayName} can sign in again.`)}
                  >
                    {a.active ? "Switch off" : "Switch on"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {adding && (
        <AddAccountModal
          onClose={() => setAdding(false)}
          onSaved={(name) => {
            setAdding(false);
            setFlash(`${name} can now sign in.`);
            void load();
          }}
        />
      )}
      {resetFor && (
        <ResetPasswordModal
          account={resetFor}
          onClose={() => setResetFor(null)}
          onSave={async (pw) => {
            await patch(resetFor.id, { password: pw }, `New password set for ${resetFor.displayName}. They've been signed out everywhere.`);
            setResetFor(null);
          }}
        />
      )}
    </>
  );
}

function AddAccountModal({ onClose, onSaved }: { onClose: () => void; onSaved: (name: string) => void }) {
  const [form, setForm] = useState({ displayName: "", username: "", role: "reception" as StaffRole, password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Add staff member" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/staff/accounts", { method: "POST", json: form });
            onSaved(form.displayName);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not create the account.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Name</span>
          <input className={fieldInput} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Username</span>
          <input className={fieldInput} autoCapitalize="none" autoCorrect="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        </label>
        <fieldset className="flex flex-col gap-2">
          <legend className={`${fieldLabel} mb-1`}>Role</legend>
          {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
            <label key={r} className="flex min-h-11 items-start gap-3 rounded-xl border border-line p-3 text-sm">
              <input type="radio" name="role" className="mt-0.5 size-5" checked={form.role === r} onChange={() => setForm({ ...form, role: r })} />
              <span>
                <span className="font-semibold">{ROLE_LABEL[r]}</span>
                <span className="block text-muted">{ROLE_HELP[r]}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Starting password</span>
          <input className={fieldInput} type="text" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <span className="text-xs text-muted">8+ characters with letters. Tell them in person; they can change it after signing in.</span>
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className={primaryBtn} disabled={busy}>
          {busy ? "Saving…" : "Create account"}
        </button>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ account, onClose, onSave }: { account: Account; onClose: () => void; onSave: (pw: string) => Promise<void> }) {
  const [pw, setPw] = useState("");
  return (
    <Modal title={`New password · ${account.displayName}`} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          await onSave(pw);
        }}
      >
        <input className={fieldInput} type="text" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="8+ characters with letters" />
        <button type="submit" className={primaryBtn} disabled={pw.length < 8}>
          Set password
        </button>
      </form>
    </Modal>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  return (
    <div className="card rounded-3xl p-5 sm:p-6">
      <p className="eyebrow text-muted">My account</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Change my password</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setMsg(null);
          try {
            await api("/api/admin/auth", { method: "POST", json: { action: "change_password", currentPassword: current, newPassword: next } });
            setCurrent("");
            setNext("");
            setMsg({ tone: "success", text: "Password changed. Other devices have been signed out." });
          } catch (err) {
            setMsg({ tone: "error", text: err instanceof Error ? err.message : "Could not change the password." });
          }
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">Current password</span>
          <input className={fieldInput} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted">New password</span>
          <input className={fieldInput} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </label>
        <button type="submit" className={primaryBtn} disabled={!current || next.length < 8}>
          Change
        </button>
      </form>
      {msg && (
        <div className="mt-3">
          <Notice tone={msg.tone}>{msg.text}</Notice>
        </div>
      )}
    </div>
  );
}

/** Username + password sign-in (shown once staff accounts exist). */
export function StaffLogin({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="bg-ground">
      <div className="mx-auto flex max-w-md flex-col gap-5 px-5 py-12 sm:py-20">
        <div>
          <p className="eyebrow text-muted">Staff only</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-4xl">Sign in to the clinic dashboard</h1>
        </div>
        <form
          className="card flex flex-col gap-4 rounded-3xl p-5 sm:p-6"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/admin/auth", { method: "POST", json: { action: "login", username, password } });
              onSignedIn();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not sign in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Username</span>
            <input className={fieldInput} autoComplete="username" autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={fieldLabel}>Password</span>
            <input className={fieldInput} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-muted">Forgot your password? Ask the clinic owner to reset it.</p>
        </form>
      </div>
    </section>
  );
}

/** First-time setup: the owner proves it with the current PIN and creates the first owner account. */
export function OwnerSetupCard() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ pin: "", displayName: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
      <p className="eyebrow text-amber-900">Action needed · owner</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Switch on staff logins to unlock Patients, Lab Reports and Statistics</h2>
      <p className="mt-1 max-w-2xl text-sm text-amber-950">
        Lab reports are medical records, so they need a personal login per staff member instead of one shared PIN. Create the owner account
        now; the shared PIN stops working straight after, and you add reception and lab logins from the Staff section.
      </p>
      {!open ? (
        <button type="button" className={`${primaryBtn} mt-4`} onClick={() => setOpen(true)}>
          Create owner account
        </button>
      ) : (
        <form
          className="mt-4 grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await api("/api/admin/auth", { method: "POST", json: { action: "setup_owner", ...form } });
              window.location.reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Could not create the account.");
              setBusy(false);
            }
          }}
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Current dashboard PIN</span>
            <input className={fieldInput} type="password" inputMode="numeric" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Your name</span>
            <input className={fieldInput} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Username</span>
            <input className={fieldInput} autoCapitalize="none" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Password (8+ characters, with letters)</span>
            <input className={fieldInput} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </label>
          {error && (
            <div className="sm:col-span-2">
              <Notice tone="error">{error}</Notice>
            </div>
          )}
          <button type="submit" className={`${primaryBtn} sm:col-span-2`} disabled={busy}>
            {busy ? "Creating…" : "Create owner account & switch off the shared PIN"}
          </button>
        </form>
      )}
    </div>
  );
}

/** Shown on the old PIN desk while the clinic records database isn't connected yet. */
export function DatabaseMissingCard() {
  return (
    <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 sm:p-6">
      <p className="eyebrow text-amber-900">Setup needed · owner</p>
      <h2 className="mt-1 font-display text-xl font-semibold text-ink">Patients, Lab Reports, WhatsApp log and Statistics are switched off</h2>
      <p className="mt-1 max-w-2xl text-sm text-amber-950">
        They need the clinic records database (Cloudflare D1, bound as <code>EP_SQL</code>), which isn&rsquo;t connected yet.
        Everything else here works as before. Setup steps: <code>docs/clinic-records-setup.md</code> in the website code.
      </p>
    </div>
  );
}
