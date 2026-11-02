"use client";

// Ultra-Refined Self-Service Booking Form with Digital Appointment Voucher & Live Slot Protection.
// Designed with Swiss Medical Editorial aesthetic (One Medical / Cleveland Clinic).
// Generates official consultation slip with Token No. that can be printed, saved as PDF, or sent to WhatsApp.

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
import { CheckIcon, ClockIcon, MapPinIcon, PhoneIcon, ShieldCheckIcon, WhatsAppIcon } from "./Icons";
import { DoctorMark } from "./DoctorMark";

const SHORT_DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SHORT_MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function chipClass(on: boolean, disabled: boolean = false) {
  if (disabled) {
    return "rounded-xl border border-dashed border-line bg-ground text-muted cursor-not-allowed opacity-50";
  }
  if (on) {
    return "rounded-xl border-2 border-brand bg-brand-tint/60 text-brand font-bold shadow-subtle ring-2 ring-brand/15 transition-all";
  }
  return "rounded-xl border border-line bg-white text-charcoal hover:border-brand-line hover:text-ink hover:bg-ground transition-all font-medium";
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs sm:text-sm font-semibold text-rose-600 mt-1">
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
    const result = validateBooking({ doctorId, date, time, name, phone, address }, doctors, current);
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
      patientAddress: address.trim() || undefined,
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
    setAddress("");
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
        <div className="appointment-slip card rounded-2xl p-6 sm:p-9 border border-brand-line bg-white shadow-card">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-md bg-brand-tint border border-brand-line/60 px-2.5 py-0.5 text-xs font-bold text-brand uppercase tracking-wider mb-2">
                <ShieldCheckIcon className="size-3.5 text-brand" />
                <span>Confirmed OPD Appointment Slip</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink font-display">
                {clinic.name}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1">
                {clinic.address}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] uppercase font-bold tracking-wider text-muted">
                Official Token No.
              </span>
              <span className="mt-1 rounded-xl bg-ink px-4 py-2 text-xl sm:text-2xl font-black tracking-wider text-white font-mono shadow-subtle border border-ink/40">
                {confirmedSlip.token}
              </span>
            </div>
          </div>

          {/* Key Appointment Details */}
          <div className="my-6 grid grid-cols-1 gap-4 rounded-xl bg-ground border border-line p-5 sm:grid-cols-2">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Consultant Specialist
              </span>
              <span className="text-base sm:text-lg font-bold text-ink mt-0.5 font-display">
                {confirmedSlip.doctorName}
              </span>
              <span className="text-xs sm:text-sm text-brand font-semibold">
                {confirmedSlip.speciality}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Consultation Schedule
              </span>
              <span className="text-base sm:text-lg font-bold text-ink mt-0.5 font-display">
                {dateLabel(confirmedSlip.date)}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-charcoal flex items-center gap-1.5 mt-0.5">
                <ClockIcon className="size-3.5 text-brand" /> Slot: {formatTime(confirmedSlip.time)} (Report 10m early)
              </span>
            </div>

            <div className="flex flex-col border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Patient Information
              </span>
              <span className="text-sm sm:text-base font-bold text-ink mt-0.5">
                {confirmedSlip.patientName}
              </span>
              {confirmedSlip.patientAddress && (
                <span className="text-xs font-semibold text-brand flex items-center gap-1 mt-0.5">
                  <MapPinIcon className="size-3 text-brand" /> {confirmedSlip.patientAddress}
                </span>
              )}
              <span className="text-xs text-muted mt-0.5">Mobile: +91 {confirmedSlip.patientPhone}</span>
            </div>

            <div className="flex flex-col border-t border-line/60 pt-3 sm:border-t-0 sm:pt-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Fee &amp; Payment Desk
              </span>
              <span className="text-sm sm:text-base font-bold text-ink mt-0.5">
                Pay Directly at Reception
              </span>
              <span className="text-xs text-muted mt-0.5">
                Zero online booking charge · Standard doctor consultation fee
              </span>
            </div>
          </div>

          {/* Important Patient Instructions */}
          <div className="rounded-xl bg-amber-50/80 border border-amber-200/70 p-4 text-xs sm:text-sm text-amber-900 mb-6">
            <p className="font-bold flex items-center gap-1.5 mb-1.5">
              <span>📌 Arrival &amp; Clinic Instructions:</span>
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-amber-800 leading-relaxed">
              <li>Present this token slip or quote <strong>Token #{confirmedSlip.token}</strong> at reception.</li>
              <li>Arrive <strong>10 to 15 minutes before {formatTime(confirmedSlip.time)}</strong> for smooth entry.</li>
              <li>Bring previous medical records, prescriptions, or investigation reports if available.</li>
            </ul>
          </div>

          {/* Action Bar (hidden when printing) */}
          <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-line pt-6">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-xs sm:text-sm font-bold text-white hover:bg-ink/90 shadow-subtle transition-all"
            >
              <span>🖨️ Print / Save PDF Slip</span>
            </button>

            <a
              href={waShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-xs sm:text-sm font-bold text-white hover:bg-[#20ba59] shadow-subtle transition-all"
            >
              <WhatsAppIcon className="size-4" />
              <span>Save to WhatsApp</span>
            </a>

            <a
              href={`tel:${clinic.phone}`}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-xs sm:text-sm font-semibold text-charcoal hover:text-ink hover:bg-ground transition-colors"
            >
              <PhoneIcon className="size-3.5 text-brand" />
              <span>Helpline: {clinic.phoneDisplay}</span>
            </a>
          </div>
        </div>

        <div className="no-print flex justify-center">
          <button
            type="button"
            onClick={reset}
            className="text-xs sm:text-sm font-semibold text-brand hover:underline py-2"
          >
            ← Book another specialist consultation
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Self-Service Booking Input Form
  // ---------------------------------------------------------------------------
  return (
    <div ref={formRef} className="min-w-0 flex flex-col gap-6 card rounded-2xl border border-line bg-white p-6 sm:gap-7 sm:p-9 shadow-card">
      {/* Returning Patient Notification */}
      {showRecent && recentReceipt && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-brand-tint/60 border border-brand-line p-3.5 text-xs sm:text-sm text-ink">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckIcon className="size-4 text-brand shrink-0" />
            <span className="truncate">
              Recent booking: <strong>{recentReceipt.doctorName}</strong> on {recentReceipt.date} ({recentReceipt.token}).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setConfirmedSlip(recentReceipt)}
            className="shrink-0 font-bold text-brand hover:underline text-xs"
          >
            View Slip →
          </button>
        </div>
      )}

      {/* 1. Doctor */}
      <fieldset className="min-w-0 flex flex-col gap-3">
        <legend className="mb-2 text-base sm:text-lg font-bold text-ink font-display flex items-center">
          <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center mr-2">
            1
          </span>
          Choose Specialist Doctor
        </legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {doctors.map((d) => {
            const isSelected = d.id === doctorId;
            return (
              <button
                key={d.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => chooseDoctor(d.id)}
                className={`${chipClass(isSelected)} flex min-h-14 items-center gap-3 p-3 text-left`}
              >
                <DoctorMark doctor={d} className="size-10 shrink-0 rounded-lg text-xs" />
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs sm:text-sm text-ink block truncate">
                    {d.name ?? d.speciality}
                  </span>
                  <span className="text-[11px] text-muted block truncate mt-0.5">
                    {d.name ? `${d.speciality} · ${d.categoryLabel}` : d.categoryLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <FieldError id="err-doctor" message={errors.doctorId} />
      </fieldset>

      {/* 2. Day */}
      {!doctor && <StepHint step="2" title="Select OPD Day & Time" hint="Choose a specialist doctor above to see their clinic consultation days." />}
      {doctor && (
        <fieldset className="min-w-0 flex flex-col gap-3">
          <legend className="mb-2 text-base sm:text-lg font-bold text-ink font-display flex items-center">
            <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center mr-2">
              2
            </span>
            Select OPD Day
          </legend>
          {dates.length > 0 ? (
            <>
              <p className="text-xs sm:text-sm text-muted">
                {doctor.name ?? doctor.speciality} sits on <span className="font-semibold text-charcoal">{opdSummary(doctor)}</span>.
              </p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {dates.map(({ date: d }) => {
                  const [, mo, day] = d.split("-").map(Number);
                  const today = clinicClock(now).dateKey;
                  const top = d === today ? "Today" : d === addDays(today, 1) ? "Tomorrow" : SHORT_DAY[weekdayOf(d)];
                  const isSelected = d === date;
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setDate(d);
                        setTime("");
                        setErrors((e) => ({ ...e, date: undefined, time: undefined }));
                      }}
                      className={`${chipClass(isSelected)} flex min-h-16 flex-col items-center justify-center p-2`}
                    >
                      <span className="text-[11px] uppercase tracking-wider text-muted font-semibold">{top}</span>
                      <span className="font-extrabold text-sm sm:text-base text-ink">
                        {day} {SHORT_MONTH[mo - 1]}
                      </span>
                      <span className="sr-only">, {dateLabel(d)}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-line bg-ground p-4 text-xs sm:text-sm text-charcoal">
              {doctor.speciality} OPD timings are currently confirmed via telephone.{" "}
              <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
                Call {clinic.phoneDisplay}
              </a>{" "}
              and reception will arrange your slot.
            </div>
          )}
          <FieldError id="err-date" message={errors.date} />
        </fieldset>
      )}

      {/* 3. Time */}
      {doctor && dates.length > 0 && !date && (
        <StepHint step="3" title="Choose Consultation Time" hint="Pick a consultation day above to view available slots." />
      )}
      {doctor && date && (
        <fieldset className="min-w-0 flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <legend className="mb-2 text-base sm:text-lg font-bold text-ink font-display flex items-center">
              <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center mr-2">
                3
              </span>
              Available Time Slot
            </legend>
            <span className="text-[11px] text-muted">
              {bookedSlots.length > 0 ? `${bookedSlots.length} booked` : "All slots available"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((s) => {
              const isTaken = bookedSlots.includes(s);
              const isSelected = s === time;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={isTaken}
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (isTaken) return;
                    setTime(s);
                    setErrors((e) => ({ ...e, time: undefined }));
                  }}
                  className={`${chipClass(isSelected, isTaken)} min-h-12 flex flex-col items-center justify-center py-2 px-1 text-center`}
                >
                  <span className={`text-xs sm:text-sm font-semibold ${isTaken ? "line-through text-muted" : "text-ink"}`}>
                    {formatTime(s)}
                  </span>
                  {isTaken && <span className="text-[9px] uppercase font-bold text-muted">Booked</span>}
                </button>
              );
            })}
          </div>
          <FieldError id="err-time" message={errors.time} />
        </fieldset>
      )}

      {/* 4. Details */}
      <fieldset className="min-w-0 flex flex-col gap-3.5">
        <legend className="mb-2 text-base sm:text-lg font-bold text-ink font-display flex items-center">
          <span className="size-6 rounded-full bg-brand-tint border border-brand-line/60 text-brand text-xs font-bold inline-flex items-center justify-center mr-2">
            4
          </span>
          Patient Details
        </legend>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bk-name" className="text-xs font-semibold text-charcoal">
            Patient Full Name *
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
            className="min-h-11 rounded-xl border border-line bg-ground px-3.5 text-xs sm:text-sm text-ink focus:border-brand focus:bg-white focus:outline-none transition-colors"
          />
          <FieldError id="err-name" message={errors.name} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="bk-phone" className="text-xs font-semibold text-charcoal">
            Active Mobile Number *
          </label>
          <div className="flex overflow-hidden rounded-xl border border-line bg-ground focus-within:border-brand focus-within:bg-white transition-colors">
            <span className="flex items-center border-r border-line bg-white/60 px-3 text-xs sm:text-sm font-semibold text-muted">
              +91
            </span>
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
              className="min-h-11 min-w-0 flex-1 px-3 text-xs sm:text-sm outline-none bg-transparent text-ink"
            />
          </div>
          <FieldError id="err-phone" message={errors.phone} />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between">
            <label htmlFor="bk-address" className="text-xs font-semibold text-charcoal">
              Village / Town / Area (Optional)
            </label>
            <span className="text-[11px] text-muted">Helps reception identify you</span>
          </div>
          <input
            id="bk-address"
            type="text"
            placeholder="e.g. Tarzoo, Dangerpora, Sangrama, Sopore"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-h-11 rounded-xl border border-line bg-ground px-3.5 text-xs sm:text-sm text-ink focus:border-brand focus:bg-white focus:outline-none transition-colors"
          />
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="button"
          onClick={submit}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm sm:text-base font-bold text-white hover:bg-brand-dark shadow-subtle hover:shadow-card transition-all"
        >
          <CheckIcon className="size-4.5" />
          <span>Confirm Slot &amp; Generate Token Slip</span>
        </button>
        <p className="text-[11px] text-muted leading-relaxed text-center sm:text-left">
          Your digital appointment voucher with a unique Token No. will be created instantly. Consultation fee is settled directly at the reception desk upon reporting. No pre-payment required.
        </p>
      </div>
    </div>
  );
}

function StepHint({ step, title, hint }: { step: string; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line/60 bg-ground/50 p-4">
      <span className="size-6 rounded-full bg-line text-muted text-xs font-bold inline-flex items-center justify-center shrink-0">
        {step}
      </span>
      <div>
        <p className="text-xs sm:text-sm font-bold text-charcoal">{title}</p>
        <p className="text-xs text-muted mt-0.5">{hint}</p>
      </div>
    </div>
  );
}
