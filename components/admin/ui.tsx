"use client";

// Small building blocks shared by the staff dashboard sections, matching the existing /admin look:
// 1px-border cards, 12-14px radius buttons, teal brand, eyebrow labels, 44px+ tap targets.

import type { ReactNode } from "react";

export const fieldLabel = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
export const fieldInput =
  "min-h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none transition-colors";
export const primaryBtn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm sm:text-base font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";
export const secondaryBtn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-4 text-sm font-semibold text-ink hover:border-brand transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";
export const smallBtn =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3 text-xs sm:text-sm font-semibold text-ink hover:border-brand transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

export function SectionHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="card rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">{title}</h2>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  processing: "border-sky-200 bg-sky-50 text-sky-900",
  ready: "border-brand-line bg-brand-tint text-ink",
  queued: "border-line bg-ground text-charcoal",
  sent: "border-sky-200 bg-sky-50 text-sky-900",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-900",
  read: "border-emerald-200 bg-emerald-50 text-emerald-900",
  failed: "border-rose-200 bg-rose-50 text-rose-900",
  not_sent: "border-line bg-ground text-muted",
  confirmed: "border-brand-line bg-brand-tint text-ink",
  arrived: "border-sky-200 bg-sky-50 text-sky-900",
  in_consultation: "border-sky-200 bg-sky-50 text-sky-900",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cancelled: "border-rose-200 bg-rose-50 text-rose-900",
  verified: "border-emerald-200 bg-emerald-50 text-emerald-900",
  unverified: "border-amber-200 bg-amber-50 text-amber-900",
};

const LABELS: Record<string, string> = {
  not_sent: "Not sent",
  in_consultation: "In cabin",
};

/** Status chip: colour plus a text label, never colour alone. */
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const text = label ?? LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md border px-2.5 py-0.5 text-xs font-bold ${TONES[status] ?? TONES.queued}`}>
      {text}
    </span>
  );
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const cls =
    tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-line bg-ground text-charcoal";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${cls}`}>
      {children}
    </p>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line-strong bg-ground px-4 py-6 text-center text-sm text-muted">{children}</p>;
}

/** "4 Nov, 3:42 pm" in clinic time. */
export function stamp(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Modal shell with a labelled title, Escape-free close button, scrollable body. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:p-7 ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-tight text-ink">{title}</h2>
          <button type="button" onClick={onClose} className={smallBtn} aria-label="Close">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
