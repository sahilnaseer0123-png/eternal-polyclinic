// A picture of what a booking request looks like in WhatsApp, built from the real data and the same
// fields as bookingMessage() in lib/booking.ts. Marked as an example; it is not anyone's real booking.

import { clinic, doctors } from "@/data/clinic";
import { DAY_NAMES, formatTime, fromMinutes, toMinutes } from "@/lib/schedule";
import { Logo } from "./Logo";

const sample = doctors.find((d) => d.opd.length > 0);

export function WhatsAppPreview({ className = "" }: { className?: string }) {
  if (!sample) return null;
  const session = sample.opd[0];
  const time = formatTime(fromMinutes(toMinutes(session.start) + sample.slotMinutes));
  const lines: [string, string][] = [
    ["Doctor", sample.name ?? sample.speciality],
    ["Day", DAY_NAMES[session.day]],
    ["Time", time],
    ["Name", "Your name"],
    ["Mobile", "Your number"],
  ];

  return (
    <figure className={`overflow-hidden rounded-[2rem] bg-white text-ink shadow-2xl shadow-ink/30 ${className}`}>
      <div className="flex items-center gap-3 bg-ink px-4 py-3 text-white">
        <Logo className="size-9 shrink-0" />
        <div className="min-w-0 leading-tight">
          <p className="font-semibold">{clinic.name}</p>
          <p className="text-sm text-slate-400">WhatsApp {clinic.whatsappDisplay}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 bg-ground px-4 py-5">
        <p className="self-center rounded-full bg-white px-3 py-0.5 text-xs font-semibold text-muted shadow-card">Example</p>
        <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-brand-tint px-4 py-3 shadow-card">
          <p className="text-[0.95rem]">Hello {clinic.name}, I would like an appointment.</p>
          <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-2 text-[0.95rem]">
            {lines.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}:</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-1 text-right text-xs text-muted">
            Sent <span aria-hidden="true">✓✓</span>
          </p>
        </div>
      </div>
      <figcaption className="border-t border-line px-4 py-3 text-sm text-muted">
        Reception calls you back to confirm the time.
      </figcaption>
    </figure>
  );
}
