"use client";

// WhatsApp Notifications: provider setup status, the message log with delivery status and errors,
// filters, and Retry for failed messages (retry never re-sends something already sent).

import { useCallback, useEffect, useState } from "react";
import { api, qs, type StaffSession, type WhatsAppSetup } from "@/lib/staff-api";
import { EmptyRow, Notice, SectionHeader, StatusPill, fieldInput, fieldLabel, smallBtn, stamp } from "./ui";

type Row = {
  id: number;
  kind: "appointment_confirmation" | "lab_report" | "owner_summary";
  refId: string;
  patientName: string | null;
  patientCode: string | null;
  toPhone: string;
  channel: string;
  status: string;
  attempt: number;
  trigger: string;
  error: string | null;
  createdBy: string | null;
  createdAt: number;
  sentAt: number | null;
  deliveredAt: number | null;
  readAt: number | null;
  failedAt: number | null;
};

type ListResponse = { notifications: Row[]; total: number; page: number; pageSize: number; failedCount: number; whatsapp: WhatsAppSetup };

const CHANNEL: Record<string, string> = {
  meta_cloud_api: "Meta WhatsApp Cloud API",
  twilio: "Twilio WhatsApp",
  webhook: "WhatsApp gateway",
  unconfigured: "Not connected",
};

export function WhatsAppSetupCard({ setup }: { setup: WhatsAppSetup }) {
  const connected = setup.channel !== "unconfigured";
  const items = [
    ["Provider", connected ? CHANNEL[setup.channel] : "Not connected", connected],
    ["Appointment template", setup.appointmentTemplate ? "Approved template set" : "Not set", setup.appointmentTemplate],
    ["Lab report template (PDF)", setup.labReportTemplate ? "Approved template set" : "Not set", setup.labReportTemplate],
    ["Delivery tracking", setup.deliveryWebhook ? "Webhook on" : "Not set", setup.deliveryWebhook],
  ] as const;
  return (
    <div className={`rounded-3xl border p-5 ${connected ? "border-line bg-white" : "border-amber-300 bg-amber-50"}`}>
      <p className="eyebrow text-muted">WhatsApp Business API</p>
      {!connected && (
        <p className="mt-2 text-sm font-semibold text-amber-950">
          WhatsApp isn&rsquo;t connected yet, so nothing is being sent. Every message is still logged below as Failed and can be
          retried once the clinic&rsquo;s WhatsApp Business account keys are added in Cloudflare (setup guide: docs/whatsapp-setup.md in the code).
        </p>
      )}
      <dl className="mt-3 grid gap-2 sm:grid-cols-4">
        {items.map(([label, value, ok]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-2">
            <dt className="text-xs font-semibold text-muted">{label}</dt>
            <dd className={`text-sm font-bold ${ok ? "text-emerald-900" : "text-amber-900"}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {connected && (!setup.appointmentTemplate || !setup.labReportTemplate) && (
        <p className="mt-3 text-xs text-muted">
          Without an approved template, WhatsApp only delivers a message if the patient messaged the clinic in the last 24 hours.
        </p>
      )}
    </div>
  );
}

export function NotificationsPanel({ session }: { session: StaffSession }) {
  const [kind, setKind] = useState(session.role === "lab" ? "lab_report" : "");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ListResponse>(`/api/staff/notifications${qs({ kind, status, q, from, to, page })}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages.");
    }
  }, [kind, status, q, from, to, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function retry(id: number) {
    setBusy(id);
    setFlash(null);
    try {
      await api(`/api/staff/notifications`, { method: "POST", json: { id } });
      setFlash({ tone: "success", text: "Sent." });
    } catch (err) {
      setFlash({ tone: "error", text: err instanceof Error ? err.message : "Retry failed." });
    } finally {
      setBusy(null);
      await load();
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="fade-in flex flex-col gap-5">
      <SectionHeader
        eyebrow="WhatsApp Notifications"
        title="Every message, and whether it arrived"
        desc="Appointment confirmations and lab reports are sent automatically once each. Failed messages stay here until someone retries them."
        action={
          data && data.failedCount > 0 ? (
            <button type="button" className={smallBtn} onClick={() => (setStatus("failed"), setPage(1))}>
              {data.failedCount} failed →
            </button>
          ) : undefined
        }
      />
      {data && <WhatsAppSetupCard setup={data.whatsapp} />}

      <div className="card rounded-3xl p-4 sm:p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1 lg:col-span-2">
          <span className={fieldLabel}>Search</span>
          <input type="search" className={fieldInput} placeholder="Patient, mobile, token or report ID" value={q} onChange={(e) => (setQ(e.target.value), setPage(1))} />
        </label>
        {session.role !== "lab" && (
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>Type</span>
            <select className={fieldInput} value={kind} onChange={(e) => (setKind(e.target.value), setPage(1))}>
              <option value="">All</option>
              <option value="appointment_confirmation">Appointment confirmations</option>
              <option value="lab_report">Lab reports</option>
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className={fieldLabel}>Status</span>
          <select className={fieldInput} value={status} onChange={(e) => (setStatus(e.target.value), setPage(1))}>
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>From</span>
            <input type="date" className={fieldInput} value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={fieldLabel}>To</span>
            <input type="date" className={fieldInput} value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} />
          </label>
        </div>
      </div>

      {flash && <Notice tone={flash.tone}>{flash.text}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <div className="card rounded-3xl p-2 sm:p-3">
        {data && data.notifications.length === 0 ? (
          <EmptyRow>No messages match.</EmptyRow>
        ) : (
          <ul className="flex flex-col divide-y divide-line">
            {data?.notifications.map((n) => (
              <li key={n.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-ink">
                    {n.kind === "lab_report" ? "Lab report" : n.kind === "owner_summary" ? "Owner summary" : "Appointment confirmation"}
                    <span className="font-normal text-muted"> · {n.refId}</span>
                  </p>
                  <p className="text-muted">
                    {n.patientName ?? "—"}
                    {n.patientCode ? ` (${n.patientCode})` : ""} · <span className="tabular-nums">{n.toPhone}</span>
                  </p>
                  <p className="text-xs text-muted tabular-nums">
                    {stamp(n.createdAt)} · {n.trigger === "auto" ? "Automatic" : `By ${n.createdBy ?? "staff"}`}
                    {n.attempt > 1 ? ` · attempt ${n.attempt}` : ""}
                    {n.deliveredAt ? ` · delivered ${stamp(n.deliveredAt)}` : ""}
                    {n.readAt ? ` · read ${stamp(n.readAt)}` : ""}
                  </p>
                  {n.error && <p className="mt-1 text-xs font-semibold text-rose-900">{n.error}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={n.status} />
                  {n.status === "failed" && n.kind !== "owner_summary" && (
                    <button type="button" className={smallBtn} disabled={busy === n.id} onClick={() => retry(n.id)}>
                      {busy === n.id ? "Retrying…" : "Retry"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
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
    </div>
  );
}
