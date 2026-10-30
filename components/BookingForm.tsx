"use client";

// Self-Service Booking Form with Instant Digital Appointment Slip & Live Slot Protection.
// Patients book directly, receive an official on-screen voucher with a unique Token No.,
// and can print or save their receipt to their phone.
// Prevents double-booking by synchronizing with reception tablet records.

import { useRef, useState } from "react";
import { clinic, doctors } from "@/data/clinic";
import { validateBooking, type BookingErrors } from "@/lib/booking";
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
import {
  confirmationTicketText,
  generateToken,
  isSlotBooked,
  saveAppointment,
  useAppointments,
  useLastReceipt,
  type Appointment,
} from "@/lib/appointments";
import { CheckIcon, ClockIcon, PhoneIcon, ShieldCheckIcon, WhatsAppIcon } from "./Icons";

const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chipClass(on: boolean, disabled: boolean = false) {
  if (disabled) {
    return "rounded-2xl border border-dashed border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60";
  }
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
  const [nowAt, setNowAt] = useState(nowMs);
  const now = new Date(nowAt);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<BookingErrors>({});
  const [confirmedSlip, setConfirmedSlip] = useState<Appointment | null>(null);
  const [showRecent, setShowRecent] = useState<boolean>(true);
  const formRef = useRef<HTMLDivElement>(null);

  const recentReceipt = useLastReceipt();
  const appointments = useAppointments();

  const doctor = doctors.find((d) => d.id === doctorId);
  const dates = doctor ? nextOpdDates(doctor, now, 4) : [];
  const slots = doctor && date ? timeSlots(doctor, date, now) : [];

  const bookedSlots = doctorId && date
    ? appointments
        .filter((a) => a.doctorId === doctorId && a.date === date && a.status !== "cancelled")
        .map((a) => a.time)
    : [];

  function chooseDoctor(id: string) {
    setDoctorId(id);
    setDate("");
    setTime("");
    setErrors((e) => ({ ...e, doctorId: undefined, date: undefined, time: undefined }));
  }

  function submit() {
    const current = new Date();
    setNowAt(current.getTime());

    // Basic and schema validation
    const result = validateBooking({ doctorId, date, time, name, phone }, doctors, current);
    if (!result.ok) {
      setErrors(result.errors);
      formRef.current?.querySelector<HTMLElement>("[role=alert]")?.scrollIntoView({ block: "center" });
      return;
    }

    // Double-booking collision check
    if (isSlotBooked(doctorId, date, time)) {
      setErrors({ time: "This slot was just booked by another patient. Please choose an alternative time." });
      return;
    }

    // Generate unique official token and save
    const token = generateToken(date, doctorId, false);
    const appointment: Appointment = {
      token,
      doctorId,
      doctorName: doctor!.name ?? doctor!.speciality,
      speciality: doctor!.speciality,
      date,
      time,
      patientName: result.data.name,
      patientPhone: result.data.phone,
      type: "online",
      status: "confirmed",
      createdAt: current.getTime(),
    };

    saveAppointment(appointment);
    setConfirmedSlip(appointment);
    setShowRecent(false);
    setErrors({});
  }

  function reset() {
    setDoctorId("");
    setDate("");
    setTime("");
    setName("");
    setPhone("");
    setErrors({});
    setConfirmedSlip(null);
  }

  // ---------------------------------------------------------------------------
  // Digital Appointment Slip / Confirmation Receipt View
  // ---------------------------------------------------------------------------
  if (confirmedSlip) {
    const ticketText = confirmationTicketText(confirmedSlip);
    const waShareUrl = `https://wa.me/?text=${encodeURIComponent(ticketText)}`;

    return (
      <div className="flex flex-col gap-6" aria-live="polite">
        {/* Printable Voucher Card */}
        <div className="appointment-slip card rounded-3xl p-6 sm:p-8 border-2 border-brand/20 bg-gradient-to-b from-brand-tint/30 via-white to-white shadow-xl">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2 text-brand font-bold text-sm uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="size-5 text-brand" />
                <span>Confirmed OPD Appointment</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">
                {clinic.name}
              </h2>
              <p className="text-sm text-muted mt-0.5">{clinic.address}</p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs uppercase font-bold text-slate-500">Token Number</span>
              <span className="rounded-xl bg-ink px-4 py-1.5 text-xl font-extrabold tracking-wider text-glow sm:text-2xl font-mono shadow-sm">
                {confirmedSlip.token}
              </span>
            </div>
          </div>

          {/* Key Appointment Details */}
          <div className="my-6 grid grid-cols-1 gap-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 p-5 sm:grid-cols-2">
            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase text-slate-500">Consultant Specialist</span>
              <span className="text-lg font-bold text-ink">{confirmedSlip.doctorName}</span>
              <span className="text-sm text-brand font-medium">{confirmedSlip.speciality}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-semibold uppercase text-slate-500">Appointment Schedule</span>
              <span className="text-lg font-bold text-ink">
                {dateLabel(confirmedSlip.date)}
              </span>
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mt-0.5">
                <ClockIcon className="size-4 text-brand" /> Slot: {formatTime(confirmedSlip.time)} (Report 10m early)
              </span>
            </div>

            <div className="flex flex-col border-t border-slate-200/60 pt-3 sm:border-t-0 sm:pt-0">
              <span className="text-xs font-semibold uppercase text-slate-500">Patient Name</span>
              <span className="text-base font-bold text-ink">{confirmedSlip.patientName}</span>
              <span className="text-sm text-slate-600">Mobile: +91 {confirmedSlip.patientPhone}</span>
            </div>

            <div className="flex flex-col border-t border-slate-200/60 pt-3 sm:border-t-0 sm:pt-0">
              <span className="text-xs font-semibold uppercase text-slate-500">Payment & Registration</span>
              <span className="text-base font-bold text-ink">Pay at Reception Desk</span>
              <span className="text-sm text-slate-600">Zero registration fee · Doctor consultation fee on arrival</span>
            </div>
          </div>

          {/* Important Patient Instructions */}
          <div className="flex flex-col gap-2 rounded-xl bg-amber-50/80 border border-amber-200/70 p-4 text-sm text-amber-900 mb-6">
            <p className="font-bold flex items-center gap-1.5">
              <span>📌 Patient Instructions:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-amber-800">
              <li>Please present this digital slip or mention your <strong>Token #{confirmedSlip.token}</strong> at reception.</li>
              <li>Arrive <strong>10 to 15 minutes before {formatTime(confirmedSlip.time)}</strong> so reception can verify your token.</li>
              <li>If you have previous medical records or prescriptions, please bring them along.</li>
            </ul>
          </div>

          {/* Action Bar (hidden when printing) */}
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-ink px-6 text-base font-bold text-white hover:bg-slate-800 shadow-md transition-all sm:min-h-14"
            >
              🖨️ Print / Save PDF Slip
            </button>

            <a
              href={waShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-base font-bold text-white hover:bg-[#20ba59] shadow-md transition-all sm:min-h-14"
            >
              <WhatsAppIcon className="size-5" /> Save to My WhatsApp
            </a>

            <a
              href={`tel:${clinic.phone}`}
              className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-line bg-white px-5 text-base font-semibold text-slate-800 hover:border-slate-400"
            >
              <PhoneIcon className="size-4" /> Helpline: {clinic.phoneDisplay}
            </a>
          </div>
        </div>

        <div className="no-print flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="min-h-11 text-base font-semibold text-brand hover:underline"
          >
            ← Book another appointment
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Self-Service Booking Input Form
  // ---------------------------------------------------------------------------
  return (
    <div ref={formRef} className="min-w-0 flex flex-col gap-6 card rounded-3xl p-4 sm:gap-7 sm:p-8">
      {/* Returning Patient Notification */}
      {showRecent && recentReceipt && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-brand-tint border border-brand/20 p-4 text-sm text-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckIcon className="size-5 text-brand shrink-0" />
            <span className="truncate">
              You have a confirmed slot for <strong>{recentReceipt.doctorName}</strong> on {recentReceipt.date} ({recentReceipt.token}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmedSlip(recentReceipt)}
            className="shrink-0 font-bold text-brand hover:underline"
          >
            View Slip
          </button>
        </div>
      )}

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

      {/* 2. Day */}
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
          <div className="flex items-baseline justify-between">
            <legend className="mb-2 text-lg font-bold sm:mb-3">3. Time Slot</legend>
            <span className="text-xs text-muted">
              {bookedSlots.length > 0 ? `${bookedSlots.length} slot(s) already booked` : "All slots open"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const isTaken = bookedSlots.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={isTaken}
                  aria-pressed={s === time}
                  onClick={() => {
                    if (isTaken) return;
                    setTime(s);
                    setErrors((e) => ({ ...e, time: undefined }));
                  }}
                  className={`${chipClass(s === time, isTaken)} min-h-12 flex flex-col items-center justify-center py-1`}
                >
                  <span className={isTaken ? "line-through text-xs sm:text-sm" : ""}>{formatTime(s)}</span>
                  {isTaken && <span className="text-[10px] uppercase font-bold text-slate-400">Booked</span>}
                </button>
              );
            })}
          </div>
          <FieldError id="err-time" message={errors.time} />
        </fieldset>
      )}

      {/* 4. Details */}
      <fieldset className="min-w-0 flex flex-col gap-4">
        <legend className="mb-2 text-lg font-bold sm:mb-3">4. Patient details</legend>
        <div className="flex flex-col gap-2">
          <label htmlFor="bk-name" className="font-semibold">
            Patient Name
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
          className="inline-flex min-h-13 items-center justify-center gap-2.5 rounded-2xl bg-brand px-6 text-base font-bold sm:min-h-14 sm:text-lg text-white hover:bg-brand-dark shadow-md hover:shadow-lg transition-all"
        >
          <CheckIcon className="size-5" /> Confirm & Get Appointment Slip
        </button>
        <p className="text-sm text-muted">
          Your official appointment voucher with token number is generated immediately on screen.
          Consultation fee is paid directly at reception desk upon arrival. No registration charges.
        </p>
      </div>
    </div>
  );
}

function StepHint({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-lg font-bold text-muted">{title}</p>
      <p className="text-base text-muted">{hint}</p>
    </div>
  );
}
