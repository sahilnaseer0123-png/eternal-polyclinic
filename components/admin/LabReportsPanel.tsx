"use client";

// Lab Reports Management: register a test for a patient, upload the PDF, check it, Mark Ready (sends the
// actual PDF + secure link on WhatsApp automatically, once), track report and delivery status separately,
// resend, and see the full history. Reception can view and resend; only lab and owner create/upload/release.

import { useCallback, useEffect, useRef, useState } from "react";
import { api, openStaffPdf, qs, type StaffSession } from "@/lib/staff-api";
import { longDate } from "@/lib/messages";
import { clinicClock } from "@/lib/schedule";
import { AddPatientModal, type PatientSummary } from "./PatientsPanel";
import { EmptyRow, Modal, Notice, SectionHeader, StatusPill, fieldInput, fieldLabel, primaryBtn, secondaryBtn, smallBtn, stamp } from "./ui";

export type LabReport = {
  id: string;
  patientId: number;
  patientCode: string;
  patientName: string;
  patientPhone: string;
  phoneVerified: boolean;
  testName: string;
  sampleDate: string;
  status: "pending" | "processing" | "ready";
  deliveryStatus: "not_sent" | "queued" | "sent" | "delivered" | "read" | "failed";
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
  uploadedAt: number | null;
  readyAt: number | null;
  lastSentAt: number | null;
  deliveredAt: number | null;
  notes: string | null;
  createdAt: number;
  lastError: string | null;
};

type ListResponse = { reports: LabReport[]; total: number; page: number; pageSize: number; counts: Record<string, number> };
type SendResult = { status: string; error?: string; duplicate?: boolean } | null;

const MAX_MB = 10;

function sendMessage(send: SendResult): { tone: "success" | "error" | "info"; text: string } | null {
  if (!send) return null;
  if (send.status === "sent") return { tone: "success", text: "Sent on WhatsApp: the PDF and the secure link are on their way to the patient." };
  if (send.duplicate) return { tone: "info", text: "Already sent for this release. Use Resend to send it again." };
  return { tone: "error", text: `Report is Ready, but WhatsApp delivery failed: ${send.error ?? "unknown error"}` };
}

export function LabReportsPanel({ session }: { session: StaffSession }) {
  const canManage = session.role === "owner" || session.role === "lab";
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [delivery, setDelivery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [uploadFor, setUploadFor] = useState<LabReport | null>(null);
  const [historyFor, setHistoryFor] = useState<LabReport | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ListResponse>(`/api/staff/lab-reports${qs({ q, status, delivery, from, to, page })}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reports.");
    }
  }, [q, status, delivery, from, to, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function markReady(r: LabReport) {
    if (!window.confirm(`Release ${r.testName} for ${r.patientName}?\n\nThe PDF will be sent on WhatsApp to ${r.patientPhone}.`)) return;
    setBusyId(r.id);
    try {
      const res = await api<{ report: LabReport; send: SendResult }>(`/api/staff/lab-reports/${r.id}`, { method: "PATCH", json: { status: "ready" } });
      setToast(sendMessage(res.send));
      await load();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof Error ? err.message : "Could not mark ready." });
    } finally {
      setBusyId(null);
    }
  }

  async function resend(r: LabReport) {
    if (!window.confirm(`Send ${r.testName} to ${r.patientName} (${r.patientPhone}) again on WhatsApp?`)) return;
    setBusyId(r.id);
    try {
      const res = await api<{ send: SendResult }>(`/api/staff/lab-reports/${r.id}/send`, { method: "POST" });
      setToast(sendMessage(res.send));
    } catch (err) {
      setToast({ tone: "error", text: err instanceof Error ? err.message : "Resend failed." });
    } finally {
      setBusyId(null);
      await load();
    }
  }

  async function takeBack(r: LabReport) {
    setBusyId(r.id);
    try {
      await api(`/api/staff/lab-reports/${r.id}`, { method: "PATCH", json: { status: "processing" } });
      await load();
    } catch (err) {
      setToast({ tone: "error", text: err instanceof Error ? err.message : "Could not change status." });
    } finally {
      setBusyId(null);
    }
  }

  const counts = data?.counts ?? {};
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="fade-in flex flex-col gap-5">
      <SectionHeader
        eyebrow="Lab Reports"
        title="Upload once, delivered on WhatsApp"
        desc="Upload the PDF, check it, then Mark Ready: the patient gets the actual PDF on WhatsApp with a secure link to view or download it again."
        action={
          canManage ? (
            <button type="button" className={primaryBtn} onClick={() => setCreating(true)}>
              + New lab report
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["pending", "Pending", "status"],
            ["processing", "Processing", "status"],
            ["ready", "Ready", "status"],
            ["delivered", "Delivered", "delivery"],
            ["failed", "Failed delivery", "delivery"],
          ] as const
        ).map(([k, label, kind]) => {
          const on = kind === "status" ? status === k : delivery === k;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setPage(1);
                if (kind === "status") {
                  setStatus(on ? "" : k);
                  setDelivery("");
                } else {
                  setDelivery(on ? "" : k);
                  setStatus("");
                }
              }}
              className={`card flex min-h-20 flex-col items-start justify-between rounded-2xl p-4 text-left transition-colors cursor-pointer ${on ? "ring-2 ring-brand" : "hover:border-line-strong"}`}
            >
              <span className="text-xs font-bold uppercase tracking-wider text-muted">{label}</span>
              <span className={`font-display text-3xl font-semibold tabular-nums ${k === "failed" && (counts[k] ?? 0) > 0 ? "text-emergency" : "text-ink"}`}>{counts[k] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="card rounded-3xl p-4 sm:p-5 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Search</span>
          <input
            type="search"
            className={fieldInput}
            value={q}
            placeholder="Patient name, mobile, patient ID or test"
            onChange={(e) => (setQ(e.target.value), setPage(1))}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>From</span>
          <input type="date" className={fieldInput} value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>To</span>
          <input type="date" className={fieldInput} value={to} min={from || undefined} onChange={(e) => (setTo(e.target.value), setPage(1))} />
        </label>
      </div>

      {toast && (
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <Notice tone={toast.tone}>{toast.text}</Notice>
          </div>
          <button type="button" className={smallBtn} onClick={() => setToast(null)}>
            Dismiss
          </button>
        </div>
      )}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="flex flex-col gap-3">
        {data && data.reports.length === 0 && <EmptyRow>No lab reports match.{canManage ? " Use “New lab report” to add one." : ""}</EmptyRow>}
        {data?.reports.map((r) => (
          <article key={r.id} className="card rounded-2xl p-4 sm:p-5 flex flex-col gap-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold text-ink">{r.testName}</p>
                <p className="text-sm text-charcoal">
                  <span className="font-semibold">{r.patientName}</span> · {r.patientCode} · <span className="tabular-nums">{r.patientPhone}</span>
                  {!r.phoneVerified && <span className="ml-2 align-middle"><StatusPill status="unverified" label="Mobile not verified" /></span>}
                </p>
                <p className="text-xs text-muted tabular-nums">
                  {r.id} · sample {longDate(r.sampleDate)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted">Report</span>
                <StatusPill status={r.status} />
                <span className="text-xs font-semibold text-muted">WhatsApp</span>
                <StatusPill status={r.deliveryStatus} />
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted sm:grid-cols-4">
              <div>
                <dt className="font-semibold">Uploaded</dt>
                <dd className="tabular-nums">{stamp(r.uploadedAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Ready</dt>
                <dd className="tabular-nums">{stamp(r.readyAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Last sent</dt>
                <dd className="tabular-nums">{stamp(r.lastSentAt)}</dd>
              </div>
              <div>
                <dt className="font-semibold">Delivered</dt>
                <dd className="tabular-nums">{stamp(r.deliveredAt)}</dd>
              </div>
            </dl>

            {r.deliveryStatus === "failed" && r.lastError && <Notice tone="error">Delivery failed: {r.lastError}</Notice>}

            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              {canManage && (
                <button type="button" className={smallBtn} onClick={() => setUploadFor(r)} disabled={busyId === r.id}>
                  {r.hasFile ? "Replace PDF" : "Upload PDF"}
                </button>
              )}
              {r.hasFile && (
                <button type="button" className={smallBtn} onClick={() => openStaffPdf(r.id).catch((e: Error) => setToast({ tone: "error", text: e.message }))}>
                  View PDF
                </button>
              )}
              {canManage && r.status === "processing" && (
                <button type="button" className={`${smallBtn} border-brand bg-brand text-white hover:bg-brand-dark`} onClick={() => markReady(r)} disabled={busyId === r.id}>
                  {busyId === r.id ? "Sending…" : "Mark Ready & send"}
                </button>
              )}
              {r.status === "ready" && (
                <button type="button" className={smallBtn} onClick={() => resend(r)} disabled={busyId === r.id}>
                  {busyId === r.id ? "Sending…" : "Resend on WhatsApp"}
                </button>
              )}
              {canManage && r.status === "ready" && (r.deliveryStatus === "failed" || r.deliveryStatus === "not_sent") && (
                <button type="button" className={smallBtn} onClick={() => takeBack(r)} disabled={busyId === r.id}>
                  Back to Processing
                </button>
              )}
              <button type="button" className={smallBtn} onClick={() => setHistoryFor(r)}>
                History
              </button>
            </div>
          </article>
        ))}
        {pages > 1 && (
          <div className="flex items-center justify-between gap-3">
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

      {creating && (
        <NewReportModal
          onClose={() => setCreating(false)}
          onCreated={(r) => {
            setCreating(false);
            setUploadFor(r);
            void load();
          }}
        />
      )}
      {uploadFor && (
        <UploadModal
          report={uploadFor}
          onClose={() => setUploadFor(null)}
          onUploaded={async () => {
            setUploadFor(null);
            setToast({ tone: "info", text: "PDF uploaded. Check it with View PDF, then press Mark Ready & send." });
            await load();
          }}
        />
      )}
      {historyFor && <HistoryModal report={historyFor} onClose={() => setHistoryFor(null)} />}
    </div>
  );
}

function NewReportModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: LabReport) => void }) {
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<PatientSummary[]>([]);
  const [patient, setPatient] = useState<PatientSummary | null>(null);
  const [registering, setRegistering] = useState(false);
  const [testName, setTestName] = useState("");
  const [sampleDate, setSampleDate] = useState(() => clinicClock(new Date()).dateKey);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = clinicClock(new Date()).dateKey;

  const searching = !patient && search.trim().length >= 2;
  useEffect(() => {
    if (!searching) return;
    const t = setTimeout(async () => {
      try {
        const res = await api<{ patients: PatientSummary[] }>(`/api/staff/patients${qs({ q: search.trim() })}`);
        setMatches(res.patients.slice(0, 8));
      } catch {
        setMatches([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, searching]);
  const shownMatches = searching ? matches : [];

  async function create() {
    if (!patient) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{ report: LabReport }>("/api/staff/lab-reports", { method: "POST", json: { patientId: patient.id, testName, sampleDate, notes } });
      onCreated(res.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the report.");
    } finally {
      setBusy(false);
    }
  }

  if (registering) {
    return (
      <AddPatientModal
        title="Register patient for lab"
        onClose={() => setRegistering(false)}
        onSaved={(p) => {
          setPatient(p);
          setRegistering(false);
        }}
      />
    );
  }

  return (
    <Modal title="New lab report" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className={fieldLabel}>1. Patient</span>
          {patient ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-line bg-brand-tint/40 p-3">
              <span className="text-sm">
                <span className="block font-semibold">{patient.name}</span>
                <span className="text-muted tabular-nums">
                  {patient.code} · {patient.phone}
                </span>
                {!patient.phoneVerified && <span className="mt-1 block"><StatusPill status="unverified" label="Mobile not verified" /></span>}
              </span>
              <button type="button" className={smallBtn} onClick={() => setPatient(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input className={fieldInput} type="search" placeholder="Search name, mobile or patient ID" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              {shownMatches.length > 0 && (
                <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
                  {shownMatches.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => setPatient(m)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-ground cursor-pointer">
                        <span>
                          <span className="font-semibold">{m.name}</span>
                          <span className="block text-muted tabular-nums">
                            {m.code} · {m.phone}
                          </span>
                        </span>
                        <span aria-hidden="true">→</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button type="button" className={`${secondaryBtn} self-start`} onClick={() => setRegistering(true)}>
                + New patient
              </button>
            </>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>2. Test</span>
          <input className={fieldInput} value={testName} onChange={(e) => setTestName(e.target.value)} placeholder="e.g. CBC, LFT, Lipid profile, Thyroid" list="ep-common-tests" />
          <datalist id="ep-common-tests">
            {["CBC", "LFT", "KFT", "Lipid profile", "Thyroid profile", "HbA1c", "Blood sugar (F/PP)", "Urine routine", "Vitamin D", "Vitamin B12", "Ultrasound report", "Echo report"].map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Sample date</span>
          <input type="date" className={fieldInput} value={sampleDate} max={today} onChange={(e) => setSampleDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabel}>Note for staff (optional, never sent)</span>
          <input className={fieldInput} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className={primaryBtn} disabled={!patient || testName.trim().length < 2 || busy} onClick={create}>
          {busy ? "Saving…" : "Save & upload PDF"}
        </button>
      </div>
    </Modal>
  );
}

function UploadModal({ report, onClose, onUploaded }: { report: LabReport; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function pick(f: File | undefined) {
    setError("");
    if (!f) return;
    if (f.type && f.type !== "application/pdf" && !/\.pdf$/i.test(f.name)) return setError("Choose a PDF file.");
    if (f.size > MAX_MB * 1024 * 1024) return setError(`PDF is larger than ${MAX_MB} MB.`);
    if (f.size < 1024) return setError("That file is too small to be a report.");
    setFile(f);
  }

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/staff/lab-reports/${encodeURIComponent(report.id)}/file`, {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(file.name) },
        body: file,
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || `Upload failed (${res.status})`);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`${report.hasFile ? "Replace" : "Upload"} PDF · ${report.testName}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted">
          {report.patientName} · {report.patientCode}. The file stays private: only signed-in staff and this patient (through their secure link) can open it.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-6 text-center ${drag ? "border-brand bg-brand-tint/40" : "border-line-strong bg-ground"}`}
        >
          <p className="text-sm font-semibold text-ink">{file ? file.name : "Drop the PDF here"}</p>
          {file && <p className="text-xs text-muted tabular-nums">{(file.size / 1024).toFixed(0)} KB</p>}
          <button type="button" className={secondaryBtn} onClick={() => input.current?.click()}>
            {file ? "Choose another file" : "Choose PDF"}
          </button>
          <input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
        <p className="text-xs text-muted">PDF only, up to {MAX_MB} MB. After upload the report is “Processing” until you press Mark Ready.</p>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="button" className={primaryBtn} disabled={!file || busy} onClick={upload}>
          {busy ? "Uploading…" : "Upload PDF"}
        </button>
      </div>
    </Modal>
  );
}

type History = {
  messages: { id: number; status: string; attempt: number; trigger: string; channel: string; error: string | null; created_at: number; sent_at: number | null; delivered_at: number | null; read_at: number | null; failed_at: number | null }[];
  events: { notification_id: number; status: string; detail: string | null; at: number }[];
  activity: { action: string; detail: string | null; at: number; by: string | null }[];
};

const ACTION_LABEL: Record<string, string> = {
  "lab.create": "Report registered",
  "lab.upload_pdf": "PDF uploaded",
  "lab.replace_pdf": "PDF replaced",
  "lab.ready": "Marked Ready",
  "lab.unready": "Moved back to Processing",
  "lab.auto_send": "Sent automatically",
  "lab.resend": "Resent by staff",
  "lab.view_pdf": "PDF viewed",
  "lab.edit": "Details edited",
};

function HistoryModal({ report, onClose }: { report: LabReport; onClose: () => void }) {
  const [data, setData] = useState<History | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    api<History>(`/api/staff/lab-reports/${report.id}`)
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [report.id]);
  return (
    <Modal title={`History · ${report.testName}`} onClose={onClose} wide>
      {error && <Notice tone="error">{error}</Notice>}
      {!data && !error && <p className="text-sm text-muted">Loading…</p>}
      {data && (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="font-display text-lg font-semibold">WhatsApp messages</h3>
            {data.messages.length === 0 ? (
              <EmptyRow>Nothing sent yet.</EmptyRow>
            ) : (
              <ul className="mt-2 flex flex-col gap-3">
                {data.messages.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-line p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {m.trigger === "auto" ? "Automatic" : "Resent by staff"} · attempt {m.attempt}
                      </span>
                      <StatusPill status={m.status} />
                    </div>
                    {m.error && <p className="mt-1 text-rose-900">{m.error}</p>}
                    <ul className="mt-2 flex flex-col gap-0.5 text-xs text-muted">
                      {data.events
                        .filter((e) => e.notification_id === m.id)
                        .map((e, i) => (
                          <li key={i} className="tabular-nums">
                            {stamp(e.at)} · {e.status}
                            {e.detail ? ` · ${e.detail}` : ""}
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="font-display text-lg font-semibold">Activity</h3>
            <ul className="mt-2 flex flex-col divide-y divide-line rounded-2xl border border-line text-sm">
              {data.activity.map((a, i) => (
                <li key={i} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span>
                    {ACTION_LABEL[a.action] ?? a.action}
                    {a.detail ? <span className="text-muted"> · {a.detail}</span> : null}
                  </span>
                  <span className="text-muted tabular-nums">
                    {stamp(a.at)}
                    {a.by ? ` · ${a.by}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </Modal>
  );
}
