"use client";

// Booking request (design v3): doctor, day, time, details. Nothing is saved: the request opens in WhatsApp
// addressed to the clinic (lib/booking.ts) and reception calls the patient to confirm. The form never claims
// the visit is confirmed, because only reception can do that.

import { useRef, useState } from "react";
import { clinic, doctors } from "@/data/clinic";
import { bookingMessage, validateBooking, whatsappLink, type BookingErrors } from "@/lib/booking";
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
import { PhoneIcon, WhatsAppIcon } from "./Icons";
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
  const [nowAt, setNowAt] = useState(nowMs);
  const now = new Date(nowAt);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<BookingErrors>({});
  const [sentLink, setSentLink] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const doctor = doctors.find((d) => d.id === doctorId);
  const dates = doctor ? nextOpdDates(doctor, now, 4) : [];
  const slots = doctor && date ? timeSlots(doctor, date, now) : [];
  const step = !doctor ? 1 : 2;

  function chooseDoctor(id: string) {
    setDoctorId(id);
    setDate("");
    setTime("");
    setErrors({});
  }

  function submit() {
    const current = new Date();
    setNowAt(current.getTime());
    const result = validateBooking({ doctorId, date, time, name, phone, address }, doctors, current);
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" });
      return;
    }
    const link = whatsappLink(clinic.whatsapp, bookingMessage(result.data, doctor!, clinic.name));
    setErrors({});
    setSentLink(link);
    window.open(link, "_blank", "noopener");
  }

  if (sentLink && doctor) {
    return (
      <div className="card rounded-3xl p-6 sm:p-9" aria-live="polite">
        <p className="eyebrow text-brand">Almost done</p>
        <h2 className="mt-3 text-[2rem] font-normal leading-none tracking-[-0.025em] sm:text-5xl">
          Press <em className="text-brand">Send</em> in WhatsApp
        </h2>
        <p className="mt-4 text-base text-muted">
          Your request for {doctor.name ?? doctor.speciality} on {dateLabel(date)} at {formatTime(time)} is written and
          waiting in WhatsApp. It reaches the clinic only after you press Send there. Reception then calls you to
          confirm. Until that call, the time is not booked.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={sentLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
          >
            <WhatsAppIcon className="size-4" />
            Open WhatsApp again
          </a>
          <a
            href={`tel:${clinic.phone}`}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink px-6 text-base font-bold hover:bg-ink hover:text-white"
          >
            <PhoneIcon className="size-4" />
            Call {clinic.phoneDisplay}
          </a>
        </div>
        <button
          type="button"
          onClick={() => setSentLink(null)}
          className="mt-5 min-h-11 text-base font-semibold text-brand underline"
        >
          Change the request
        </button>
      </div>
    );
  }

  return (
    <div ref={formRef} className="card flex min-w-0 flex-col gap-8 rounded-3xl p-5 sm:p-9">
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
            {doctors.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => chooseDoctor(d.id)}
                className="flex min-h-16 items-center gap-3 rounded-2xl border border-line-strong bg-white p-3 text-left hover:border-brand"
              >
                <DoctorMark doctor={d} className="size-11 rounded-full text-base" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-medium leading-tight">{d.name ?? d.speciality}</span>
                  <span className="block text-sm text-muted">{d.speciality}</span>
                </span>
              </button>
            ))}
          </div>
          <FieldError id="err-doctor" message={errors.doctorId} />
        </fieldset>
      ) : (
        <div className="flex items-center gap-3.5 rounded-2xl border border-line bg-ground p-3.5">
          <DoctorMark doctor={doctor} className="size-12 rounded-full text-lg" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-medium leading-tight">{doctor.name ?? doctor.speciality}</p>
            <p className="text-sm text-muted">{opdSummary(doctor) ?? doctor.speciality}</p>
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
          {doctor.name ?? doctor.speciality} sees patients by appointment. Please call{" "}
          <a href={`tel:${clinic.phone}`} className="font-bold text-brand underline">
            {clinic.phoneDisplay}
          </a>{" "}
          and reception will fix a time.
        </p>
      )}

      {/* Day */}
      {doctor && dates.length > 0 && (
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className={label}>Day</legend>
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
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === time}
                onClick={() => {
                  setTime(s);
                  setErrors((e) => ({ ...e, time: undefined }));
                }}
                className={`${chip(s === time)} min-h-12 px-1 text-[0.9375rem] font-semibold`}
              >
                {formatTime(s)}
              </button>
            ))}
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
            <p className="text-sm text-muted">
              We never ask the reason for your visit. The message names your doctor only, and it stays in your WhatsApp
              chat.
            </p>
          </fieldset>

          <div>
            <button
              type="button"
              onClick={submit}
              className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 text-base font-bold text-white hover:bg-brand-dark"
            >
              <WhatsAppIcon className="size-4" />
              Send request on WhatsApp
            </button>
            <p className="mt-3 text-center text-sm text-muted">Reception will call you to confirm.</p>
          </div>
        </>
      )}
    </div>
  );
}
