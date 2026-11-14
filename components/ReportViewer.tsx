"use client";

// The patient's secure report page (/report/#<token>), opened from the WhatsApp message.
// The token is after "#", so it never reaches server logs; the patient confirms the last 4 digits
// of their registered mobile, then the PDF is fetched once and shown / downloaded from memory.

import { useEffect, useState, useSyncExternalStore } from "react";
import { clinic } from "@/data/clinic";
import { longDate } from "@/lib/messages";
import { DownloadIcon, PhoneIcon, ReportIcon } from "./Icons";

type Meta = { firstName: string; testName: string; sampleDate: string; fileName: string; expiresAt: number };

const subscribeHash = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
const readHash = () => window.location.hash.replace(/^#/, "").trim();

export function ReportViewer() {
  const token = useSyncExternalStore(subscribeHash, readHash, () => "");
  const [last4, setLast4] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<{ meta: Meta; url: string } | null>(null);

  useEffect(() => {
    return () => {
      if (report) URL.revokeObjectURL(report.url);
    };
  }, [report]);

  async function open(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/report/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, last4 }),
        cache: "no-store",
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || "Could not open the report.");
      }
      const meta = JSON.parse(decodeURIComponent(res.headers.get("X-Report") ?? "%7B%7D")) as Meta;
      const url = URL.createObjectURL(await res.blob());
      setReport({ meta, url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the report. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  const waHelp = `https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent("Hello, I need help opening my lab report link.")}`;

  if (report) {
    const { meta, url } = report;
    return (
      <div className="flex flex-col gap-5">
        <div className="card rounded-3xl p-5 sm:p-7">
          <p className="eyebrow text-muted">Your lab report</p>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{meta.testName}</h1>
          <p className="mt-1 text-muted">
            For {meta.firstName} · sample taken {longDate(meta.sampleDate)}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a href={url} target="_blank" rel="noopener" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark">
              <ReportIcon className="size-5" /> Open PDF
            </a>
            <a href={url} download={meta.fileName} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-5 text-base font-bold hover:bg-ink hover:text-white">
              <DownloadIcon className="size-5" /> Download
            </a>
          </div>
          <p className="mt-4 text-sm text-muted">
            This link works until {new Date(meta.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })}. The PDF is also in your
            WhatsApp chat. Please show the report to your doctor; don&rsquo;t forward this link.
          </p>
        </div>
        <iframe src={url} title={`${meta.testName} PDF`} className="hidden h-[80vh] w-full rounded-3xl border border-line bg-white sm:block" />
      </div>
    );
  }

  return (
    <div className="rise card mx-auto flex w-full max-w-md flex-col gap-4 rounded-3xl p-5 sm:p-7">
      <div>
        <p className="eyebrow text-muted">Secure lab report</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-ink">Open your report</h1>
      </div>
      {!token ? (
        <p className="text-base text-charcoal">
          Open this page from the link in your WhatsApp message from {clinic.name}. If you&rsquo;ve lost it, ask the clinic to resend your report.
        </p>
      ) : (
        <form onSubmit={open} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-base font-semibold text-ink">Last 4 digits of your mobile number</span>
            <span className="text-sm text-muted">The number your report was sent to.</span>
            <input
              className="min-h-12 w-40 rounded-xl border border-line-strong bg-white px-3.5 text-xl tracking-[0.3em] tabular-nums text-ink focus:border-brand focus:outline-none"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              pattern="\d{4}"
              value={last4}
              onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              required
            />
          </label>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-semibold text-rose-900">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy || last4.length !== 4} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60">
            {busy ? "Opening…" : "View my report"}
          </button>
        </form>
      )}
      <div className="flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
        <a href={`tel:${clinic.phone}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-ink underline decoration-line-strong">
          <PhoneIcon className="size-4" /> Call {clinic.phoneDisplay}
        </a>
        <a href={waHelp} className="inline-flex min-h-11 items-center font-semibold text-ink underline decoration-line-strong">
          WhatsApp the clinic
        </a>
      </div>
    </div>
  );
}
