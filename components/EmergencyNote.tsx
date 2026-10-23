// "Emergency? Don't book online." The clinic is not an emergency service; this says where to go instead.
// Facts come from clinic.emergency in data/clinic.ts.

import { clinic } from "@/data/clinic";

export function EmergencyNote({ hint, className = "" }: { hint?: string; className?: string }) {
  return (
    <p role="note" className={`flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-emergency ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 size-5 shrink-0">
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <span>
        {hint ? <strong>{hint} </strong> : <strong>Emergency? Don&apos;t book online. </strong>}
        Go to {clinic.emergency.place}, or call{" "}
        <a href={`tel:${clinic.emergency.phone}`} className="font-bold underline">
          {clinic.emergency.phone}
        </a>
        .
      </span>
    </p>
  );
}
