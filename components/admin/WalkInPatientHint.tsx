"use client";

// Under the walk-in mobile field: shows who is already registered on that number, so reception can
// pick the existing patient (no duplicate record) or carry on to register a family member.

import { useEffect, useState } from "react";
import { api } from "@/lib/staff-api";
import type { PatientSummary } from "./PatientsPanel";

export function WalkInPatientHint({ phone, name, onPick }: { phone: string; name: string; onPick: (p: PatientSummary) => void }) {
  const [matches, setMatches] = useState<PatientSummary[]>([]);
  const digits = phone.replace(/\D/g, "").slice(-10);
  const valid = /^[6-9]\d{9}$/.test(digits);

  useEffect(() => {
    if (!valid) return;
    let active = true;
    api<{ patients: PatientSummary[] }>(`/api/staff/patients?phone=${digits}`)
      .then((r) => active && setMatches(r.patients))
      .catch(() => active && setMatches([]));
    return () => {
      active = false;
    };
  }, [digits, valid]);

  const shown = valid ? matches.filter((m) => m.phone === digits) : [];
  if (shown.length === 0) {
    return valid ? <p className="text-xs text-muted">New number: a patient record will be created when you save.</p> : null;
  }
  const typed = name.trim().toLowerCase();
  return (
    <div className="rounded-xl border border-brand-line bg-brand-tint/40 p-3 text-sm" aria-live="polite">
      <p className="font-semibold text-ink">Already registered on this number:</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {shown.map((p) => {
          const same = typed && p.name.trim().toLowerCase() === typed;
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onPick(p)}
                className="flex min-h-10 w-full items-center justify-between gap-2 rounded-lg bg-white px-3 text-left hover:ring-1 hover:ring-brand cursor-pointer"
              >
                <span>
                  <span className="font-semibold">{p.name}</span>{" "}
                  <span className="text-muted tabular-nums">
                    {p.code} · {p.visitCount ?? 0} visit{p.visitCount === 1 ? "" : "s"}
                  </span>
                </span>
                <span className="text-xs font-bold text-brand">{same ? "Selected ✓" : "Use"}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-1.5 text-xs text-muted">A different name on the same number is saved as a separate family member.</p>
    </div>
  );
}
