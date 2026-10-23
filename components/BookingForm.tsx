"use client";

// Booking form: doctor → OPD day → time → name and phone → WhatsApp.
// `nowMs` comes from the server at request time, so the server and browser draw the same dates.
// The request is re-checked against the real clock when the patient presses the button.
// Deep link: /book?doctor=akash opens the form with Dr. Akash already chosen.

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
import { ChatIcon, PhoneIcon } from "./Icons";

const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chipClass(on: boolean) {
  return `rounded-xl border text-base ${
    on ? "border-2 border-brand bg-brand-tint font-semibold" : "border-line bg-white hover:border-brand"
  }`;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-base font-medium text-emergency">
      {message}
    </p>
  );
}

export function BookingForm({ nowMs, initialDoctorId = "" }: { nowMs: number; initialDoctorId?: string }) {
  const now = new Date(nowMs);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<BookingErrors>({});
  const [sent, setSent] = useState<{ link: string; phone: string } | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const doctor = doctors.find((d) => d.id === doctorId);
  const dates = doctor ? nextOpdDates(doctor, now, 4) : [];
  const slots = doctor && date ? timeSlots(doctor, date, now) : [];

  function chooseDoctor(id: string) {
    setDoctorId(id);
    setDate("");
    setTime("");
    setErrors((e) => ({ ...e, doctorId: undefined, date: undefined, time: undefined }));
  }


  function submit() {
    const result = validateBooking({ doctorId, date, time, name, phone }, doctors, new Date());
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" });
      return;
    }
    const link = whatsappLink(clinic.whatsapp, bookingMessage(result.data, doctor!, clinic.name));
    setErrors({});
    setSent({ link, phone: result.data.phone });
    window.open(link, "_blank", "noopener");
  }

  function reset() {
    setDoctorId("");
    setDate("");
    setTime("");
    setName("");
    setPhone("");
    setErrors({});
    setSent(null);
  }

  if (sent && doctor) {
    return (
      <div className="flex flex-col gap-5 card rounded-3xl p-6 sm:p-8" aria-live="polite">
        <div className="flex size-14 items-center justify-center rounded-full bg-brand-tint text-brand" aria-hidden="true">
          <ChatIcon className="size-7" />
        </div>
        <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">One last step: press Send in WhatsApp</h3>
        <p>
          WhatsApp should have opened with your request to {clinic.name} ({clinic.whatsappDisplay}). Press{" "}
          <strong>Send</strong> there. Reception
          will call you on <strong>{sent.phone}</strong> to confirm. Your slot isn&apos;t
          confirmed until they do.
        </p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-2xl bg-ground p-5 text-base">
          <dt className="text-muted">Doctor</dt>
          <dd className="font-semibold">{doctor.name ?? doctor.speciality}</dd>
          <dt className="text-muted">When</dt>
          <dd className="font-semibold">
            {dateLabel(date)}, {formatTime(time)}
          </dd>
          <dt className="text-muted">Fee</dt>
          <dd className="font-semibold">₹{clinic.consultationFee} consultation</dd>
        </dl>
        <a
          href={sent.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-semibold text-white hover:bg-brand-dark"
        >
          <ChatIcon /> WhatsApp didn&apos;t open? Tap here
        </a>
        <a
          href={`tel:${clinic.phone}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 card rounded-2xl px-6 font-semibold hover:text-brand"
        >
          <PhoneIcon /> Or call {clinic.phoneDisplay}
        </a>
        <button type="button" onClick={reset} className="min-h-11 text-base font-semibold text-brand underline">
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <div ref={formRef} className="min-w-0 flex flex-col gap-6 card rounded-3xl p-4 sm:gap-7 sm:p-8">
      {/* 1. Doctor */}
      <fieldset className="min-w-0 flex flex-col gap-3">
        <legend className="mb-2 text-lg font-bold sm:mb-3">1. Doctor</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {doctors.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={d.id === doctorId}
              onClick={() => chooseDoctor(d.id)}
              className={`${chipClass(d.id === doctorId)} flex min-h-12 flex-col items-start justify-center px-4 py-2 sm:min-h-14 text-left`}
            >
              <span className="font-semibold">{d.name ?? d.speciality}</span>
              <span className="text-sm text-muted">{d.name ? `${d.speciality} · ${d.categoryLabel}` : d.categoryLabel}</span>
            </button>
          ))}
        </div>
        <FieldError id="err-doctor" message={errors.doctorId} />
      </fieldset>

      {/* 2. Day */}
      {doctor && (
        <fieldset className="min-w-0 flex flex-col gap-3">
          <legend className="mb-2 text-lg font-bold sm:mb-3">2. Day</legend>
          {dates.length > 0 ? (
            <>
              <p className="text-base text-muted">
                {doctor.name ?? doctor.speciality} sits on {opdSummary(doctor)}.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                      className={`${chipClass(d === date)} flex min-h-14 flex-col items-center justify-center sm:min-h-16`}
                    >
                      <span className="text-sm">{top}</span>
                      <span className="font-bold">
                        {day} {SHORT_MONTH[mo - 1]}
                      </span>
                      <span className="sr-only">, {dateLabel(d)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="rounded-2xl bg-ground p-4">
              {doctor.speciality} timings aren&apos;t online yet.{" "}
              <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
                Call {clinic.phoneDisplay}
              </a>{" "}
              to book.
            </p>
          )}
          <FieldError id="err-date" message={errors.date} />
        </fieldset>
      )}

      {/* 3. Time */}
      {doctor && date && (
        <fieldset className="min-w-0 flex flex-col gap-3">
          <legend className="mb-2 text-lg font-bold sm:mb-3">3. Time</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={s === time}
                onClick={() => {
                  setTime(s);
                  setErrors((e) => ({ ...e, time: undefined }));
                }}
                className={`${chipClass(s === time)} min-h-12`}
              >
                {formatTime(s)}
              </button>
            ))}
          </div>
          <FieldError id="err-time" message={errors.time} />
        </fieldset>
      )}

      {/* 4. Details */}
      <fieldset className="min-w-0 flex flex-col gap-4">
        <legend className="mb-2 text-lg font-bold sm:mb-3">4. Your details</legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="bk-name" className="font-semibold">
            Name
          </label>
          <input
            id="bk-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
            className="min-h-12 rounded-xl border border-slate-400 bg-white px-4 text-lg sm:min-h-13"
          />
          <FieldError id="err-name" message={errors.name} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="bk-phone" className="font-semibold">
            Mobile number
          </label>
          <div className="flex overflow-hidden rounded-xl border border-slate-400 bg-white focus-within:outline-3 focus-within:outline-ink">
            <span className="flex items-center border-r border-slate-400 bg-ground px-4 text-lg text-muted">+91</span>
            <input
              id="bk-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setErrors((er) => ({ ...er, phone: undefined }));
              }}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "err-phone" : undefined}
              className="min-h-12 min-w-0 flex-1 px-4 text-lg outline-none sm:min-h-13"
            />
          </div>
          <FieldError id="err-phone" message={errors.phone} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={submit}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-lg font-bold sm:min-h-14 text-white hover:bg-brand-dark"
        >
          <ChatIcon /> Send request on WhatsApp
        </button>
        <p className="text-base text-muted">
          Consultation ₹{clinic.consultationFee}. We only ask your name and number, never the reason for your visit.
          Reception calls you to confirm.
        </p>
      </div>
    </div>
  );
}
