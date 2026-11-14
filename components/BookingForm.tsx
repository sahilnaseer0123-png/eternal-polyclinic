"use client";

// Instant on-website booking (design v4): doctor, day, time, details -> POST /api/book locks the slot,
// issues an EP-... token slip on screen and triggers an automatic WhatsApp confirmation from the clinic.
// A "Find My Token" tab lets patients look up / cancel by mobile number. No medical reason is ever asked.

import { useRef, useState } from "react";
import { clinic } from "@/data/clinic";
import { type BookingErrors, validateBooking } from "@/lib/booking";
import {
  cancelOnlineBooking,
  confirmationTicketText,
  isDoctorOnLeave,
  lookupBookingsByPhone,
  submitOnlineBooking,
  useActiveDoctors,
  useBookedSlots,
  useDoctorStatuses,
  type Appointment,
  type LookupAppointment,
} from "@/lib/appointments";
import {
  addDays,
  clinicClock,
  dateLabel,
  formatTime,
  nextOpdDates,
  opdSummary,
  timeSlots,
  weekdayOf,
} from "@/lib/schedule";
import { CheckIcon, PhoneIcon, PrinterIcon, WhatsAppIcon } from "./Icons";
import { DoctorMark } from "./DoctorMark";

const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const chip = (on: boolean) =>
  `rounded-xl border text-ink transition-colors ${
    on ? "border-brand bg-brand text-white" : "border-line-strong bg-white hover:border-brand"
  }`;
const label = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const input =
  "min-h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-semibold text-emergency">
      {message}
    </p>
  );
}

export function BookingForm({ nowMs, initialDoctorId = "" }: { nowMs: number; initialDoctorId?: string }) {
  const activeDoctors = useActiveDoctors();
  const statuses = useDoctorStatuses();
  const [tab, setTab] = useState<"book" | "find">("book");
  const [nowAt, setNowAt] = useState(nowMs);
  const now = new Date(nowAt);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<BookingErrors>({});
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ apt: Appointment; whatsappSent: boolean } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const doctor = activeDoctors.find((d) => d.id === doctorId);
  const onLeave = doctor ? isDoctorOnLeave(doctor) : false;
  const liveStatus = doctor ? statuses[doctor.id] : undefined;
  const dates = doctor && !onLeave ? nextOpdDates(doctor, now, 4) : [];
  const slots = doctor && date && !onLeave ? timeSlots(doctor, date, now) : [];
  const bookedSlots = useBookedSlots(doctor?.id ?? "", date);
  const step = !doctor ? 1 : 2;

  function chooseDoctor(id: string) {
    setDoctorId(id);
    setDate("");
    setTime("");
    setErrors({});
    setFormMessage("");
  }

  async function submit() {
    if (submitting) return;
    const current = new Date();
    setNowAt(current.getTime());
    setFormMessage("");
    const result = validateBooking({ doctorId, date, time, name, phone, address }, activeDoctors, current);
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" });
      return;
    }
    setSubmitting(true);
    const res = await submitOnlineBooking({ ...result.data, website });
    setSubmitting(false);
    if (res.ok) {
      setErrors({});
      setConfirmed({ apt: res.appointment, whatsappSent: res.whatsappSent });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (res.status === 409) setTime("");
    setErrors(res.errors);
    setFormMessage(res.message ?? "");
    formRef.current?.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" });
  }

  async function cancelConfirmed() {
    if (!confirmed) return;
    setCancelling(true);
    const res = await cancelOnlineBooking(confirmed.apt.token, confirmed.apt.patientPhone);
    setCancelling(false);
    if (!res.ok) {
      setFormMessage(res.error ?? "Could not cancel.");
      return;
    }
    setConfirmed(null);
    setTime("");
    setFormMessage("Your previous slot was released. Pick a new time below.");
  }

  const tabs = (
    <div role="tablist" aria-label="Booking options" className="no-print grid grid-cols-2 gap-1.5 rounded-2xl bg-sand p-1.5">
      {(
        [
          ["book", "Book Appointment"],
          ["find", "Find My Token"],
        ] as const
      ).map(([id, text]) => (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={tab === id}
          onClick={() => setTab(id)}
          className={`min-h-11 rounded-xl text-base font-bold transition-colors ${
            tab === id ? "bg-brand text-white" : "text-ink hover:bg-white"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );

  if (tab === "find") {
    return (
      <div className="card flex min-w-0 flex-col gap-6 rounded-3xl p-5 sm:p-9">
        {tabs}
        <FindMyToken />
      </div>
    );
  }

  if (confirmed) {
    const apt = confirmed.apt;
    const waCopy = `https://wa.me/?text=${encodeURIComponent(confirmationTicketText(apt))}`;
    return (
      <div className="flex min-w-0 flex-col gap-4" aria-live="polite">
        <div className="no-print">{tabs}</div>
        <TokenSlip apt={apt} whatsappSent={confirmed.whatsappSent} />
        {formMessage && (
          <p role="alert" className="no-print text-sm font-semibold text-emergency">
            {formMessage}
          </p>
        )}
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
          >
            <PrinterIcon className="size-4" />
            Print / Save PDF slip
          </button>
          <a
            href={waCopy}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-6 text-base font-bold hover:bg-ink hover:text-white"
          >
            <WhatsAppIcon className="size-4" />
            Save copy to WhatsApp
          </a>
          <button
            type="button"
            disabled={cancelling}
            onClick={cancelConfirmed}
            className="inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-base font-semibold text-brand underline disabled:opacity-60"
          >
            {cancelling ? "Releasing slot…" : "Cancel / change slot"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={formRef} className="card flex min-w-0 flex-col gap-8 rounded-3xl p-5 sm:p-9">
      {tabs}
      <div className="flex items-center justify-between">
        <p className="eyebrow text-muted">Step {step} of 2</p>
        <div className="flex gap-1.5 w-28" aria-hidden="true">
          <span className="h-1 flex-1 rounded-full bg-brand" />
          <span className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-brand" : "bg-line"}`} />
        </div>
      </div>

      {/* Doctor */}
      {!doctor ? (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Choose a doctor</legend>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            {activeDoctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => chooseDoctor(d.id)}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-line-strong bg-white p-3 text-left hover:border-brand"
              >
                <DoctorMark doctor={d} className="size-11 rounded-md text-base" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-medium leading-tight">{d.name ?? d.speciality}</span>
                  <span className="block text-sm text-muted">
                    {isDoctorOnLeave(d) ? `${d.speciality} · ${d.availability}` : d.speciality}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <FieldError id="err-doctor" message={errors.doctorId} />
        </fieldset>
      ) : (
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-ground p-3.5">
          <DoctorMark doctor={doctor} className="size-12 rounded-md text-lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-xl font-medium leading-tight">{doctor.name ?? doctor.speciality}</p>
              {liveStatus?.state === "in_clinic" && (
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint border border-brand-line px-2.5 py-0.5 text-xs font-bold text-ink">
                  <span className="size-1.5 rounded-full bg-[#22A05B]" aria-hidden="true" />
                  In Clinic Now
                </span>
              )}
              {liveStatus?.state === "delayed" && (
                <span className="inline-block rounded-md bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  Delayed ~{liveStatus.delayMinutes ?? 30}m
                </span>
              )}
              {liveStatus?.state === "cancelled" && (
                <span className="inline-block rounded-md bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-bold text-red-800">
                  Today&rsquo;s OPD Cancelled
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {onLeave ? doctor.availability : (opdSummary(doctor) ?? doctor.speciality)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => chooseDoctor("")}
            className="min-h-11 shrink-0 px-2 text-sm font-bold text-brand underline"
          >
            Change
          </button>
        </div>
      )}

      {doctor && dates.length === 0 && (
        <p className="rounded-2xl bg-sand p-4 text-base text-charcoal">
          {onLeave
            ? `${doctor.name ?? doctor.speciality} is currently marked ${doctor.availability?.toLowerCase() ?? "on leave"}. Please call `
            : `${doctor.name ?? doctor.speciality} sees patients by appointment. Please call `}
          <a href={`tel:${clinic.phone}`} className="font-bold text-brand underline">
            {clinic.phoneDisplay}
          </a>{" "}
          {onLeave ? "for the next available date." : "and reception will fix a time."}
        </p>
      )}

      {/* Day */}
      {doctor && dates.length > 0 && (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className={label}>Day</legend>
          {doctor.opd.some((s) => s.recurrence === "alternate") && (
            <p className="text-xs font-medium text-muted">
              Visits on alternate weeks — reception will confirm the exact Friday when they call you.
            </p>
          )}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {dates.map(({ date: d }) => {
              const [, mo, day] = d.split("-").map(Number);
              const today = clinicClock(now).dateKey;
              const top = d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : SHORT_DAY[weekdayOf(d)];
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={d === date}
                  onClick={() => {
                    setDate(d);
                    setTime("");
                    setErrors((e) => ({ ...e, date: undefined, time: undefined }));
                  }}
                  className={`${chip(d === date)} flex min-h-16 flex-col items-start justify-center px-4 py-2.5 text-left`}
                >
                  <span className={`text-sm font-semibold ${d === date ? "text-mint" : "text-muted"}`}>{top}</span>
                  <span className="font-display text-xl font-medium leading-tight">
                    {day} {SHORT_MONTH[mo - 1]}
                  </span>
                  <span className="sr-only">, {dateLabel(d)}</span>
                </button>
              );
            })}
          </div>
          <FieldError id="err-date" message={errors.date} />
        </fieldset>
      )}

      {/* Time */}
      {doctor && date && (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className={label}>Time</legend>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {slots.map((s) => {
              const taken = bookedSlots.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={taken}
                  aria-pressed={s === time}
                  onClick={() => {
                    if (taken) return;
                    setTime(s);
                    setErrors((e) => ({ ...e, time: undefined }));
                  }}
                  className={
                    taken
                      ? "min-h-12 rounded-xl border border-line bg-ground px-1 text-[0.9375rem] font-semibold text-muted/60 line-through cursor-not-allowed"
                      : `${chip(s === time)} min-h-12 px-1 text-[0.9375rem] font-semibold`
                  }
                >
                  {formatTime(s)}
                </button>
              );
            })}
          </div>
          <FieldError id="err-time" message={errors.time} />
        </fieldset>
      )}

      {/* Details */}
      {doctor && dates.length > 0 && (
        <>
          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className={`${label} mb-1`}>Your details</legend>
            <div>
              <label htmlFor="bk-name" className="mb-1.5 block text-sm font-bold">
                Your name
              </label>
              <input
                id="bk-name"
                type="text"
                autoComplete="name"
                placeholder="Full name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((er) => ({ ...er, name: undefined }));
                }}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "err-name" : undefined}
                className={input}
              />
              <FieldError id="err-name" message={errors.name} />
            </div>
            <div>
              <label htmlFor="bk-phone" className="mb-1.5 block text-sm font-bold">
                Mobile number
              </label>
              <input
                id="bk-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="10-digit mobile number"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((er) => ({ ...er, phone: undefined }));
                }}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "err-phone" : undefined}
                className={input}
              />
              <FieldError id="err-phone" message={errors.phone} />
            </div>
            <div>
              <label htmlFor="bk-address" className="mb-1.5 block text-sm font-bold">
                Village or area <span className="font-medium text-muted">(optional)</span>
              </label>
              <input
                id="bk-address"
                type="text"
                placeholder="For example, Tarzoo, Sopore"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={input}
              />
            </div>
            <div aria-hidden="true" className="sr-only">
              <label htmlFor="bk-website">Leave this field empty</label>
              <input
                id="bk-website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted">
              We never ask the reason for your visit.
              {clinic.whatsappAutoConfirm ? " Your confirmation message on WhatsApp names your doctor only." : ""}
            </p>
          </fieldset>

          <div>
            {formMessage && (
              <p role="alert" className="mb-3 text-sm font-semibold text-emergency">
                {formMessage}
              </p>
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              <CheckIcon className="size-4" />
              {submitting ? "Confirming slot…" : "Confirm Appointment"}
            </button>
            <p className="mt-3 text-center text-sm text-muted">
              {clinic.whatsappAutoConfirm
                ? "Your slot is locked instantly and a confirmation is sent to your WhatsApp."
                : "Your slot is locked instantly and your token appears on screen. Take a screenshot."}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function TokenSlip({ apt, whatsappSent }: { apt: Appointment; whatsappSent?: boolean }) {
  return (
    <div className="appointment-slip card rounded-3xl p-6 sm:p-9">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-line bg-brand-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-ink">
          <CheckIcon className="size-3.5" /> Appointment Confirmed
        </span>
        <span className="font-display text-xl font-semibold tabular-nums lining-nums">Token #{apt.token}</span>
      </div>
      <h2 className="mt-4 text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
        {apt.doctorName}
      </h2>
      <p className="mt-1 text-lg font-semibold text-charcoal tabular-nums lining-nums">
        {dateLabel(apt.date)} · {formatTime(apt.time)}
      </p>
      <dl className="mt-5 grid gap-2 rounded-2xl border border-line bg-ground p-4 text-base sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted">Patient</dt>
          <dd className="font-semibold">{apt.patientName}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Mobile</dt>
          <dd className="font-semibold tabular-nums lining-nums">+91 {apt.patientPhone}</dd>
        </div>
        {apt.patientAddress && (
          <div>
            <dt className="text-sm text-muted">Village / area</dt>
            <dd className="font-semibold">{apt.patientAddress}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-sm text-muted">Clinic</dt>
          <dd className="font-semibold">
            {clinic.name}, Sopore
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-base text-charcoal">
        Arrive 10–15 minutes early and show this token at reception. Pay the consultation fee at reception. Questions? Call{" "}
        {clinic.phoneDisplay}.
      </p>
      <p className="no-print mt-3 text-sm font-semibold text-ink">
        {whatsappSent
          ? `✓ Confirmation message sent to your WhatsApp (+91 ${apt.patientPhone}).`
          : "Keep this slip safe: screenshot it, print it, or use Find My Token with your mobile number."}
      </p>
    </div>
  );
}

function FindMyToken() {
  const [phone, setPhone] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<LookupAppointment[] | null>(null);
  const [printing, setPrinting] = useState<string | null>(null);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setError("");
    if (!/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      setError("Enter the 10-digit mobile number used while booking.");
      return;
    }
    setLoading(true);
    const res = await lookupBookingsByPhone(phone, token);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      setResults(null);
      return;
    }
    setResults(res.appointments);
  }

  async function cancel(a: Appointment) {
    if (!window.confirm(`Cancel token ${a.token} with ${a.doctorName}?`)) return;
    const res = await cancelOnlineBooking(a.token, a.patientPhone);
    if (!res.ok) {
      setError(res.error ?? "Could not cancel.");
      return;
    }
    setResults((r) => r?.map((x) => (x.token === a.token ? { ...x, status: "cancelled" } : x)) ?? null);
  }

  const printed = results?.find((r) => r.token === printing);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={search} className="no-print flex flex-col gap-4">
        <h2 className="font-display text-2xl font-medium tracking-tight sm:text-3xl">Find my token</h2>
        <div>
          <label htmlFor="ft-phone" className="mb-1.5 block text-sm font-bold">
            Mobile number
          </label>
          <input
            id="ft-phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={input}
          />
        </div>
        <div>
          <label htmlFor="ft-token" className="mb-1.5 block text-sm font-bold">
            Token no. <span className="font-medium text-muted">(optional)</span>
          </label>
          <input
            id="ft-token"
            type="text"
            placeholder="EP-AK1031-01"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className={input}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-emergency">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Searching…" : "Find my appointments"}
        </button>
      </form>

      {results && results.length === 0 && (
        <p className="no-print rounded-2xl bg-sand p-4 text-base text-charcoal">
          No bookings found for this number. Call {clinic.phoneDisplay} if you need help.
        </p>
      )}

      {printed && (
        <div className="hidden print:block">
          <TokenSlip apt={printed} />
        </div>
      )}

      <ul className="no-print flex flex-col gap-3">
        {results?.map((a) => {
          const live = a.doctorLiveStatus;
          return (
            <li key={a.token} className="rounded-2xl border border-line-strong p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold tabular-nums lining-nums">#{a.token}</span>
                <span className="rounded-md bg-sand px-2.5 py-0.5 text-xs font-bold capitalize">
                  {a.status.replace("_", " ")}
                </span>
                {live?.state === "in_clinic" && (
                  <span className="rounded-md border border-brand-line bg-brand-tint px-2.5 py-0.5 text-xs font-bold">
                    Doctor In Clinic
                  </span>
                )}
                {live?.state === "delayed" && (
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    Delayed ~{live.delayMinutes ?? 30}m
                  </span>
                )}
                {live?.state === "cancelled" && (
                  <span className="rounded-md border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-800">
                    OPD Cancelled
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-base">
                {a.doctorName} · {dateLabel(a.date)} · {formatTime(a.time)}
              </p>
              {a.status !== "cancelled" && a.status !== "completed" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPrinting(a.token);
                      setTimeout(() => window.print(), 50);
                    }}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-ink px-4 text-base font-bold hover:bg-ink hover:text-white"
                  >
                    <PrinterIcon className="size-4" /> Print slip
                  </button>
                  <button
                    type="button"
                    onClick={() => cancel(a)}
                    className="min-h-11 rounded-xl px-4 text-base font-semibold text-emergency underline"
                  >
                    Cancel booking
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="no-print text-sm text-muted">
        Need help? Call{" "}
        <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-1 font-bold text-brand underline">
          <PhoneIcon className="size-3.5" />
          {clinic.phoneDisplay}
        </a>
        .
      </p>
    </div>
  );
}
