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

// Modern chip: chosen = solid ink pill with shadow, others = card with border line.
function chipClass(on: boolean) {
  return `rounded-2xl border text-base transition-all duration-150 ${
    on ? "border-ink bg-ink font-bold text-white shadow-sm ring-2 ring-ink/20" : "border-line/80 bg-white hover:border-slate-400 text-slate-800"
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
  // Starts at the server's time; refreshed on every submit, so a page left open for a while
  // stops offering times that have already passed.
  const [nowAt, setNowAt] = useState(nowMs);
  const now = new Date(nowAt);
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
    const current = new Date();
    setNowAt(current.getTime());
    const result = validateBooking({ doctorId, date, time, name, phone }, doctors, current);
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
        <div className="flex size-14 items-center justify-center rounded-full bg-[#25D366]/15 text-[#25D366]" aria-hidden="true">
          <ChatIcon className="size-8" />
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
          <dd className="font-semibold">Pay at clinic (Zero registration fee)</dd>
        </dl>
        <a
          href={sent.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-lg font-bold text-white hover:bg-[#20ba59] shadow-md transition-all"
        >
          <ChatIcon className="size-5" /> Open WhatsApp to Send
        </a>
        <a
          href={`tel:${clinic.phone}`}
          className="inline-flex min-h-12 items-center justify-center gap-2 card rounded-2xl px-6 font-semibold hover:text-brand"
        >
          <PhoneIcon /> Or call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
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
              <span className={`text-sm ${d.id === doctorId ? "text-slate-300" : "text-muted"}`}>
                {d.name ? `${d.speciality} · ${d.categoryLabel}` : d.categoryLabel}
              </span>
            </button>
          ))}
        </div>
        <FieldError id="err-doctor" message={errors.doctorId} />
      </fieldset>

      {/* 2. Day (until a doctor is chosen, a muted note keeps the numbering 1-2-3-4 visible) */}
      {!doctor && <StepHint title="2. Day and 3. Time" hint="Choose a doctor first. Their days and times appear here." />}
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
                Call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
              </a>{" "}
              to book.
            </p>
          )}
          <FieldError id="err-date" message={errors.date} />
        </fieldset>
      )}

      {/* 3. Time */}
      {doctor && dates.length > 0 && !date && <StepHint title="3. Time" hint="Pick a day first." />}
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
            placeholder="e.g. Farooq Ahmad"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((er) => ({ ...er, name: undefined }));
            }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "err-name" : undefined}
            className="min-h-12 rounded-xl border border-line/90 bg-white px-4 text-base sm:text-lg sm:min-h-13 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
          />
          <FieldError id="err-name" message={errors.name} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="bk-phone" className="font-semibold">
            Mobile number
          </label>
          <div className="flex overflow-hidden rounded-xl border border-line/90 bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 transition-all">
            <span className="flex items-center border-r border-line/90 bg-ground px-4 text-base sm:text-lg font-medium text-slate-600">+91</span>
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
              className="min-h-12 min-w-0 flex-1 px-4 text-base sm:text-lg outline-none sm:min-h-13 bg-transparent"
            />
          </div>
          <FieldError id="err-phone" message={errors.phone} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={submit}
          className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 text-base font-bold sm:min-h-14 sm:text-lg text-white hover:bg-[#20ba59] shadow-md hover:shadow-lg transition-all"
        >
          <ChatIcon className="size-6" /> Send request on WhatsApp
        </button>
        <p className="text-sm text-muted">
          Consultation fee is paid directly at the clinic. We only ask your name and number, never the reason for your visit.
          Reception calls you to confirm.
        </p>
      </div>
    </div>
  );
}

/** A step that isn't available yet: same heading style as a fieldset legend, muted. */
function StepHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-lg font-bold text-muted">{title}</p>
      <p className="text-base text-muted">{hint}</p>
    </div>
  );
}
