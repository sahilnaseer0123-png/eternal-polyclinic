"use client";

// Patient Statistics: totals and daily / weekly / monthly trends, all counted from database records.

import { useEffect, useState } from "react";
import { api } from "@/lib/staff-api";
import { Notice, SectionHeader } from "./ui";

type Point = { label: string; start: string; registrations: number; appointments: number; reports: number };
type Stats = {
  today: string;
  totals: Record<
    | "totalPatients"
    | "totalAppointments"
    | "totalReports"
    | "pendingReports"
    | "completedReports"
    | "deliveredReports"
    | "failedReports"
    | "todayRegistrations"
    | "todayAppointments"
    | "failedMessages",
    number
  >;
  daily: Point[];
  weekly: Point[];
  monthly: Point[];
};

const METRICS = [
  ["appointments", "Appointments"],
  ["registrations", "New patients"],
  ["reports", "Lab reports"],
] as const;

export function StatsPanel() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState<"daily" | "weekly" | "monthly">("daily");
  const [metric, setMetric] = useState<(typeof METRICS)[number][0]>("appointments");

  useEffect(() => {
    api<Stats>("/api/staff/stats")
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const t = data?.totals;
  const cards: [string, number | undefined, string?][] = [
    ["Registered patients", t?.totalPatients],
    ["New today", t?.todayRegistrations],
    ["Appointments (all time)", t?.totalAppointments],
    ["Appointments today", t?.todayAppointments],
    ["Lab reports", t?.totalReports],
    ["Reports pending", t?.pendingReports],
    ["Reports completed", t?.completedReports],
    ["Reports delivered", t?.deliveredReports],
  ];

  const series = data ? data[range] : [];
  const max = Math.max(1, ...series.map((p) => p[metric]));
  const total = series.reduce((s, p) => s + p[metric], 0);

  return (
    <div className="fade-in flex flex-col gap-5">
      <SectionHeader eyebrow="Patient Statistics" title="Clinic activity" desc="Counted from the patient database. Appointments are counted on their visit date; cancelled visits are left out." />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, n]) => (
          <div key={label} className="card rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-ink">{n ?? "—"}</p>
          </div>
        ))}
      </div>
      {t && (t.failedReports > 0 || t.failedMessages > 0) && (
        <Notice tone="error">
          {t.failedMessages} WhatsApp message{t.failedMessages === 1 ? "" : "s"} failed ({t.failedReports} lab report{t.failedReports === 1 ? "" : "s"}). See WhatsApp Notifications to retry.
        </Notice>
      )}

      <div className="card rounded-3xl p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Measure">
            {METRICS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={metric === k}
                onClick={() => setMetric(k)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold cursor-pointer ${metric === k ? "bg-ink text-white" : "border border-line text-charcoal hover:border-line-strong"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2" role="group" aria-label="Period">
            {(["daily", "weekly", "monthly"] as const).map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={range === r}
                onClick={() => setRange(r)}
                className={`min-h-10 rounded-full px-4 text-sm font-semibold capitalize cursor-pointer ${range === r ? "bg-brand text-white" : "border border-line text-charcoal hover:border-line-strong"}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          {total} in the last {range === "daily" ? "30 days" : range === "weekly" ? "12 weeks" : "12 months"}
        </p>
        <div className="mt-4 flex h-48 items-end gap-[3px] sm:gap-1.5" role="img" aria-label={`${METRICS.find((m) => m[0] === metric)![1]} per ${range.replace("ly", "")}`}>
          {series.map((p) => (
            <div key={p.start} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t-md bg-brand transition-colors group-hover:bg-brand-dark"
                style={{ height: `${(p[metric] / max) * 100}%`, minHeight: p[metric] > 0 ? 4 : 1 }}
                title={`${p.label}: ${p[metric]}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
          <span>{series[0]?.label}</span>
          <span>{series.at(-1)?.label}</span>
        </div>

        <details className="mt-4">
          <summary className="min-h-10 cursor-pointer text-sm font-semibold text-ink">Show the numbers</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm tabular-nums">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <th className="px-2 py-2">Period</th>
                  <th className="px-2 py-2">Appointments</th>
                  <th className="px-2 py-2">New patients</th>
                  <th className="px-2 py-2">Lab reports</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.start} className="border-b border-line/60">
                    <td className="px-2 py-1.5">{p.label}</td>
                    <td className="px-2 py-1.5">{p.appointments}</td>
                    <td className="px-2 py-1.5">{p.registrations}</td>
                    <td className="px-2 py-1.5">{p.reports}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </div>
  );
}
