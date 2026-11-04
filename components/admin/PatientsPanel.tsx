"use client";

// Patient Management: searchable patient database with filters, add patient, and a profile with
// appointment history, lab reports, WhatsApp messages and editable details (incl. mobile verification).

import { useCallback, useEffect, useState } from "react";
import type { Doctor } from "@/data/clinic";
import { api, openStaffPdf, qs, type StaffSession } from "@/lib/staff-api";
import { formatTime } from "@/lib/schedule";
import { longDate } from "@/lib/messages";
import { EmptyRow, Modal, Notice, SectionHeader, StatusPill, fieldInput, fieldLabel, primaryBtn, secondaryBtn, smallBtn, stamp } from "./ui";

export type PatientSummary = {
  id: number;
  code: string;
  name: string;
  phone: string;
  phoneVerified: boolean;
  area: string | null;
  source: string;
  createdAt: number;
  createdDate: string;
  visitCount?: number;
  lastVisit?: string | null;
  reportCount?: number;
};

type ListResponse = { patients: PatientSummary[]; total: number; page: number; pageSize: number };

const APPT_STATUS = [
  ["", "Any appointment status"],
  ["confirmed", "Confirmed"],
  ["arrived", "Arrived"],
  ["in_consultation", "In cabin"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

const REPORT_STATUS = [
  ["", "Any report status"],
  ["pending", "Pending"],
  ["processing", "Processing"],
  ["ready", "Ready"],
  ["sent", "Sent"],
  ["delivered", "Delivered"],
  ["failed", "Failed"],
] as const;

export function PatientsPanel({ session, doctors }: { session: StaffSession; doctors: Doctor[] }) {
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [service, setService] = useState("");
  const [apptStatus, setApptStatus] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api<ListResponse>(`/api/staff/patients${qs({ q, from, to, service, apptStatus, reportStatus, page })}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load patients.");
    } finally {
      setLoading(false);
    }
  }, [q, from, to, service, apptStatus, reportStatus, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const filtersOn = Boolean(from || to || service || apptStatus || reportStatus);

  return (
    <div className="fade-in flex flex-col gap-5">
      <SectionHeader
        eyebrow="Patient Management"
        title="Patient records"
        desc="One record per patient across reception, online booking and the lab. Same mobile + same name = same patient; family members sharing a phone get their own records."
        action={
          <button type="button" className={primaryBtn} onClick={() => setAdding(true)}>
            + Add patient
          </button>
        }
      />

      <div className="card rounded-3xl p-4 sm:p-5 flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Search</span>
          <input
            className={fieldInput}
            type="search"
            value={q}
            placeholder="Name, mobile number or patient ID (EPP-00012)"
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Registered from</span>
            <input type="date" className={fieldInput} value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Registered to</span>
            <input type="date" className={fieldInput} value={to} min={from || undefined} onChange={(e) => (setTo(e.target.value), setPage(1))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Service</span>
            <select className={fieldInput} value={service} onChange={(e) => (setService(e.target.value), setPage(1))}>
              <option value="">All services</option>
              <option value="lab">Lab tests</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? d.speciality}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted">Appointment</span>
            <select className={fieldInput} value={apptStatus} onChange={(e) => (setApptStatus(e.target.value), setPage(1))}>
              {APPT_STATUS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 lg:col-span-1">
            <span className="text-xs font-semibold text-muted">Lab report</span>
            <select className={fieldInput} value={reportStatus} onChange={(e) => (setReportStatus(e.target.value), setPage(1))}>
              {REPORT_STATUS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        </div>
        {filtersOn && (
          <button
            type="button"
            className={`${smallBtn} self-start`}
            onClick={() => {
              setFrom("");
              setTo("");
              setService("");
              setApptStatus("");
              setReportStatus("");
              setPage(1);
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="card rounded-3xl p-2 sm:p-3">
        <div className="flex items-center justify-between px-3 py-2 text-sm text-muted">
          <span aria-live="polite">{loading ? "Loading…" : data ? `${data.total} patient${data.total === 1 ? "" : "s"}` : ""}</span>
        </div>
        {data && data.patients.length === 0 && !loading ? (
          <EmptyRow>No patients match. Patients appear here as soon as reception, the lab or online booking registers them.</EmptyRow>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <th className="px-3 py-2.5 font-bold">Patient</th>
                  <th className="px-3 py-2.5 font-bold">Mobile</th>
                  <th className="px-3 py-2.5 font-bold">Registered</th>
                  <th className="px-3 py-2.5 font-bold">Visits</th>
                  <th className="px-3 py-2.5 font-bold">Last visit</th>
                  <th className="px-3 py-2.5 font-bold">Reports</th>
                </tr>
              </thead>
              <tbody>
                {data?.patients.map((p) => (
                  <tr key={p.id} className="border-b border-line/70 last:border-0 hover:bg-ground">
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => setOpenId(p.id)} className="min-h-10 text-left cursor-pointer">
                        <span className="block font-semibold text-ink underline decoration-line-strong underline-offset-2">{p.name}</span>
                        <span className="block text-xs text-muted tabular-nums">{p.code}{p.area ? ` · ${p.area}` : ""}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      <span className="flex flex-wrap items-center gap-2">
                        {p.phone}
                        <StatusPill status={p.phoneVerified ? "verified" : "unverified"} label={p.phoneVerified ? "Verified" : "Not verified"} />
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{longDate(p.createdDate)}</td>
                    <td className="px-3 py-2.5 tabular-nums">{p.visitCount ?? 0}</td>
                    <td className="px-3 py-2.5 tabular-nums">{p.lastVisit ? longDate(p.lastVisit) : "—"}</td>
                    <td className="px-3 py-2.5 tabular-nums">{p.reportCount ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 px-3 py-3">
            <button type="button" className={smallBtn} disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              ← Previous
            </button>
            <span className="text-sm text-muted tabular-nums">
              Page {page} of {pages}
            </span>
            <button type="button" className={smallBtn} disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
              Next →
            </button>
          </div>
        )}
      </div>

      {adding && (
        <AddPatientModal
          onClose={() => setAdding(false)}
          onSaved={(p) => {
            setAdding(false);
            setOpenId(p.id);
            void load();
          }}
        />
      )}
      {openId !== null && (
        <PatientProfile id={openId} session={session} onClose={() => setOpenId(null)} onChanged={() => void load()} />
      )}
    </div>
  );
}

export function AddPatientModal({
  onClose,
  onSaved,
  title = "Add patient",
}: {
  onClose: () => void;
  onSaved: (p: PatientSummary, created: boolean) => void;
  title?: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [verified, setVerified] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function save() {
    setError("");
    setBusy(true);
    try {
      const res = await api<{ patient: PatientSummary; created: boolean }>("/api/staff/patients", {
        method: "POST",
        json: { name, phone, area, verified },
      });
      if (!res.created) setNotice(`Already registered as ${res.patient.code}. Using the existing record.`);
      onSaved(res.patient, res.created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Patient name</span>
          <input className={fieldInput} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Mobile number (WhatsApp)</span>
          <input className={fieldInput} inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Village / area (optional)</span>
          <input className={fieldInput} value={area} onChange={(e) => setArea(e.target.value)} />
        </label>
        <label className="flex min-h-11 items-start gap-3 rounded-xl border border-line p-3 text-sm text-ink">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={verified} onChange={(e) => setVerified(e.target.checked)} />
          <span>
            <span className="font-semibold">I confirmed this mobile number with the patient.</span>{" "}
            <span className="text-muted">Lab reports are only sent to verified numbers.</span>
          </span>
        </label>
        {notice && <Notice tone="info">{notice}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" className={primaryBtn} disabled={busy}>
          {busy ? "Saving…" : "Save patient"}
        </button>
      </form>
    </Modal>
  );
}

type Profile = {
  patient: PatientSummary;
  appointments: { token: string; doctor_name: string; date: string; time: string | null; type: string; status: string; deleted_at: number | null }[];
  reports: { id: string; test_name: string; sample_date: string; status: string; delivery_status: string; file_name: string | null; created_at: number }[];
  notifications: { id: number; kind: string; ref_id: string; status: string; attempt: number; error: string | null; created_at: number }[];
};

export function PatientProfile({ id, session, onClose, onChanged }: { id: number; session: StaffSession; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", area: "", phoneVerified: false });
  const [saved, setSaved] = useState("");
  const canEdit = session.role !== "lab";

  const [version, setVersion] = useState(0);
  const load = useCallback(async () => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    api<Profile>(`/api/staff/patients/${id}`)
      .then((d) => {
        if (!active) return;
        setData(d);
        setForm({ name: d.patient.name, phone: d.patient.phone, area: d.patient.area ?? "", phoneVerified: d.patient.phoneVerified });
      })
      .catch((err: Error) => active && setError(err.message || "Could not load the patient."));
    return () => {
      active = false;
    };
  }, [id, version]);

  async function save() {
    setError("");
    try {
      await api(`/api/staff/patients/${id}`, { method: "PATCH", json: form });
      setEditing(false);
      setSaved("Saved.");
      onChanged();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  const p = data?.patient;
  return (
    <Modal title={p ? `${p.name} · ${p.code}` : "Patient"} onClose={onClose} wide>
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}
      {error && <Notice tone="error">{error}</Notice>}
      {p && (
        <div className="flex flex-col gap-6">
          {!editing ? (
            <div className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2">
              <div>
                <p className={fieldLabel}>Mobile</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 font-semibold tabular-nums">
                  {p.phone}
                  <StatusPill status={p.phoneVerified ? "verified" : "unverified"} label={p.phoneVerified ? "Verified" : "Not verified"} />
                </p>
              </div>
              <div>
                <p className={fieldLabel}>Registered</p>
                <p className="mt-1 font-semibold">{longDate(p.createdDate)} · via {p.source}</p>
              </div>
              <div>
                <p className={fieldLabel}>Area</p>
                <p className="mt-1 font-semibold">{p.area || "—"}</p>
              </div>
              {canEdit && (
                <div className="flex flex-wrap items-end gap-2">
                  <button type="button" className={smallBtn} onClick={() => setEditing(true)}>
                    Edit details
                  </button>
                  {!p.phoneVerified && (
                    <button
                      type="button"
                      className={smallBtn}
                      onClick={async () => {
                        await api(`/api/staff/patients/${id}`, { method: "PATCH", json: { phoneVerified: true } }).catch((e: Error) => setError(e.message));
                        setSaved("Mobile number marked verified.");
                        onChanged();
                        await load();
                      }}
                    >
                      Mark mobile verified
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <form
              className="grid gap-3 rounded-2xl border border-line p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Name</span>
                <input className={fieldInput} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Mobile</span>
                <input className={fieldInput} inputMode="numeric" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-muted">Area</span>
                <input className={fieldInput} value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </label>
              <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
                <input type="checkbox" className="size-5" checked={form.phoneVerified} onChange={(e) => setForm({ ...form, phoneVerified: e.target.checked })} />
                Mobile confirmed with the patient
              </label>
              <div className="flex gap-2 sm:col-span-2">
                <button type="submit" className={primaryBtn}>
                  Save
                </button>
                <button type="button" className={secondaryBtn} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
          {saved && <Notice tone="success">{saved}</Notice>}

          {session.role !== "lab" && (
            <section>
              <h3 className="font-display text-lg font-semibold">Appointment history ({data.appointments.length})</h3>
              {data.appointments.length === 0 ? (
                <EmptyRow>No appointments yet.</EmptyRow>
              ) : (
                <ul className="mt-2 flex flex-col divide-y divide-line rounded-2xl border border-line">
                  {data.appointments.map((a) => (
                    <li key={a.token} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                      <span>
                        <span className="font-semibold">{a.doctor_name}</span>
                        <span className="block text-muted tabular-nums">
                          {longDate(a.date)}
                          {a.time ? `, ${formatTime(a.time)}` : ""} · {a.token} · {a.type === "walk_in" ? "Reception" : "Online"}
                        </span>
                      </span>
                      {a.deleted_at ? <StatusPill status="cancelled" label="Deleted" /> : <StatusPill status={a.status} />}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section>
            <h3 className="font-display text-lg font-semibold">Lab reports ({data.reports.length})</h3>
            {data.reports.length === 0 ? (
              <EmptyRow>No lab reports yet.</EmptyRow>
            ) : (
              <ul className="mt-2 flex flex-col divide-y divide-line rounded-2xl border border-line">
                {data.reports.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold">{r.test_name}</span>
                      <span className="block text-muted tabular-nums">
                        {r.id} · sample {longDate(r.sample_date)}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-2">
                      <StatusPill status={r.status} />
                      <StatusPill status={r.delivery_status} />
                      {r.file_name && (
                        <button type="button" className={smallBtn} onClick={() => openStaffPdf(r.id).catch((e: Error) => setError(e.message))}>
                          View PDF
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {session.role !== "lab" && data.notifications.length > 0 && (
            <section>
              <h3 className="font-display text-lg font-semibold">WhatsApp messages</h3>
              <ul className="mt-2 flex flex-col divide-y divide-line rounded-2xl border border-line">
                {data.notifications.map((n) => (
                  <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span>
                      <span className="font-semibold">{n.kind === "lab_report" ? "Lab report" : "Appointment confirmation"}</span>
                      <span className="block text-muted">
                        {stamp(n.created_at)} · {n.ref_id}
                        {n.error ? ` · ${n.error}` : ""}
                      </span>
                    </span>
                    <StatusPill status={n.status} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Modal>
  );
}
