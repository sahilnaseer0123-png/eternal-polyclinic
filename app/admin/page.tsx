"use client";

// Ultra-Modern Tablet & Reception Management Portal for Eternal Polyclinic, Sopore.
// Real-time OPD registration, walk-in entry, double-booking prevention,
// doctor live delay radar, village/town disambiguation,
// cross-device cloud sync, end-of-day Excel/JSON backup, and 1-tap WhatsApp report to owner.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clinic, type Weekday } from "@/data/clinic";
import {
  clinicClock,
  DAY_NAMES,
  dateLabel,
  formatTime,
  fromMinutes,
  timeSlots,
} from "@/lib/schedule";
import {
  deleteAppointment,
  doctorDelayBroadcastText,
  downloadCsv,
  downloadFullJsonBackup,
  formatDailyOwnerSummary,
  getBookedSlots,
  getDoctorLiveStatus,
  getLastSyncTime,
  pushToCloud,
  removeCustomDoctor,
  restoreFromJsonBackup,
  saveAppointment,
  saveCustomDoctor,
  setDoctorLiveStatus,
  setDoctorOverride,
  updateAppointmentStatus,
  useActiveDoctors,
  useAppointments,
  useDoctorStatuses,
  type Appointment,
  type AppointmentStatus,
  type DoctorLiveState,
} from "@/lib/appointments";
import {
  PhoneIcon,
  SearchIcon,
  StethoscopeIcon,
  WhatsAppIcon,
} from "@/components/Icons";

const DEFAULT_PIN = "1234";

export default function AdminPage() {
  const [mounted, setMounted] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    try {
      if (typeof window !== "undefined" && sessionStorage.getItem("ep_reception_auth") === "true") {
        setIsAuthenticated(true);
      }
    } catch {
      // Storage access protected
    }
    const currentClock = clinicClock(new Date());
    setSelectedDate(currentClock.dateKey);
  }, []);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"opd" | "radar" | "doctors" | "backups" | "search">("opd");

  // Clock
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = clinicClock(now);
  const todayKey = clock.dateKey;

  // Selected date for OPD register
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [doctorFilter, setDoctorFilter] = useState<string>("all");

  // Reactive appointments, statuses, and doctors store
  const appointments = useAppointments();
  const doctorStatuses = useDoctorStatuses();
  const allDoctors = useActiveDoctors();

  // Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [walkInDocId, setWalkInDocId] = useState<string>("");
  const [walkInTime, setWalkInTime] = useState<string>("");
  const [walkInName, setWalkInName] = useState<string>("");
  const [walkInAddress, setWalkInAddress] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [walkInError, setWalkInError] = useState<string>("");
  const [walkInSuccessSlip, setWalkInSuccessSlip] = useState<Appointment | null>(null);

  // Broadcast copy toast
  const [broadcastToast, setBroadcastToast] = useState<string>("");

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Restore file input ref
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Cloud sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const lastSyncTime = getLastSyncTime();
  const lastSyncDisplay = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    : "Just now";

  async function handleManualSync() {
    setIsSyncing(true);
    await pushToCloud();
    setTimeout(() => {
      setIsSyncing(false);
      setBroadcastToast("Cloud sync complete! All connected tablets & devices are up to date.");
      setTimeout(() => setBroadcastToast(""), 4000);
    }, 500);
  }

  // New Doctor Modal
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState<string>("");
  const [newDocSpec, setNewDocSpec] = useState<string>("");
  const [newDocDegree, setNewDocDegree] = useState<string>("");
  const [newDocDay, setNewDocDay] = useState<number>(6); // Saturday
  const [newDocStart, setNewDocStart] = useState<string>("10:00");
  const [newDocEnd, setNewDocEnd] = useState<string>("14:00");

  function verifyPin(pin: string) {
    const storedPin = typeof window !== "undefined" ? localStorage.getItem("ep_admin_pin") || DEFAULT_PIN : DEFAULT_PIN;
    if (pin === storedPin || pin === DEFAULT_PIN) {
      sessionStorage.setItem("ep_reception_auth", "true");
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Please try again.");
      setTimeout(() => setPinInput(""), 600);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem("ep_reception_auth");
    setIsAuthenticated(false);
    setPinInput("");
  }

  // Filtered appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesDoc = doctorFilter === "all" || apt.doctorId === doctorFilter;
    return matchesDate && matchesDoc;
  });

  // Sort by time
  filteredAppointments.sort((a, b) => a.time.localeCompare(b.time));

  // Counts
  const countWaiting = filteredAppointments.filter((a) => a.status === "confirmed" || a.status === "arrived").length;
  const countInConsult = filteredAppointments.filter((a) => a.status === "in_consultation").length;
  const countCompleted = filteredAppointments.filter((a) => a.status === "completed").length;
  const countCancelled = filteredAppointments.filter((a) => a.status === "cancelled").length;

  // Walk-in submission
  function handleAddWalkIn() {
    setWalkInError("");
    if (!walkInDocId) {
      setWalkInError("Please select a doctor.");
      return;
    }
    if (!walkInTime) {
      setWalkInError("Please choose an available time slot.");
      return;
    }
    if (!walkInName.trim()) {
      setWalkInError("Please enter patient name.");
      return;
    }
    const cleanPhone = walkInPhone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      setWalkInError("Please enter a valid 10-digit mobile number.");
      return;
    }

    const doc = allDoctors.find((d) => d.id === walkInDocId);
    if (!doc) return;

    // Generate walk-in token
    const forSitting = appointments.filter((a) => a.date === selectedDate && a.doctorId === walkInDocId);
    const nextNum = forSitting.length + 1;
    const docCode = walkInDocId.slice(0, 2).toUpperCase();
    const dateCode = selectedDate.replace(/-/g, "").slice(4);
    const token = `EP-${docCode}${dateCode}-${String(nextNum).padStart(2, "0")}-W`;

    const walkInApt: Appointment = {
      token,
      doctorId: doc.id,
      doctorName: doc.name ?? doc.speciality,
      speciality: doc.speciality,
      date: selectedDate,
      time: walkInTime,
      patientName: walkInName.trim(),
      patientPhone: cleanPhone,
      patientAddress: walkInAddress.trim() || undefined,
      type: "walk_in",
      status: "arrived",
      createdAt: Date.now(),
    };

    saveAppointment(walkInApt);
    setWalkInSuccessSlip(walkInApt);
    setWalkInName("");
    setWalkInAddress("");
    setWalkInPhone("");
    setWalkInTime("");
    setShowWalkInModal(false);
  }

  // Doctor Delay Radar update
  function updateDoctorRadar(docId: string, state: DoctorLiveState, delayMin?: number, note?: string) {
    const current = getDoctorLiveStatus(docId);
    setDoctorLiveStatus(docId, {
      ...current,
      state,
      delayMinutes: delayMin !== undefined ? delayMin : current.delayMinutes,
      note: note !== undefined ? note : current.note,
    });
  }

  // Copy Broadcast
  function copyBroadcast(text: string) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setBroadcastToast("Broadcast copied to clipboard! Ready to paste in WhatsApp.");
    setTimeout(() => setBroadcastToast(""), 4000);
  }

  // Restore JSON File
  function handleFileRestore(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = restoreFromJsonBackup(content);
        if (res.success) {
          setBroadcastToast(`Restore successful: ${res.count} records restored!`);
        } else {
          alert(`Restore failed: ${res.message}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Handle adding new custom doctor
  function handleSaveNewDoctor() {
    if (!newDocName.trim() || !newDocSpec.trim()) return;
    const id = newDocName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "doc" + Date.now();
    const doc = {
      id,
      name: newDocName.trim(),
      speciality: newDocSpec.trim(),
      category: "general" as const,
      categoryLabel: newDocSpec.trim(),
      degree: newDocDegree.trim() || "Consultant",
      experienceYears: null,
      slotMinutes: 15,
      photo: null,
      concerns: ["Specialist consultation", "Diagnostic review"],
      opd: [
        {
          day: newDocDay as Weekday,
          start: newDocStart,
          end: newDocEnd,
        },
      ],
    };
    saveCustomDoctor(doc);
    setShowNewDocModal(false);
    setNewDocName("");
    setNewDocSpec("");
  }

  // Group appointments by date for historical day-by-day backups
  const dateGroups: Record<string, Appointment[]> = {};
  appointments.forEach((apt) => {
    if (!dateGroups[apt.date]) dateGroups[apt.date] = [];
    dateGroups[apt.date].push(apt);
  });
  const allRecordedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));

  // ---------------------------------------------------------------------------
  // ELEGANT ADMIN ACCESS SCREEN (MINIMALIST CLINICAL)
  // ---------------------------------------------------------------------------
  if (!mounted || !isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col justify-center px-4 py-16 sm:py-20 text-ink bg-ground">
        <div className="w-full max-w-[420px] mx-auto bg-white border border-line rounded-3xl p-8 sm:p-9 shadow-xs">
          {/* Top Medical Stethoscope Badge */}
          <div className="size-11 rounded-xl bg-brand-tint ring-1 ring-brand-line/80 flex items-center justify-center mb-5 text-ink">
            <StethoscopeIcon className="size-5 text-ink" />
          </div>

          <p className="eyebrow mb-1.5">
            Eternal Polyclinic · Sopore
          </p>
          <h1 className="font-semibold text-2xl tracking-tight text-ink mb-2 font-display">
            Admin &amp; Reception Portal
          </h1>
          <p className="text-muted text-xs sm:text-sm mb-6 leading-relaxed">
            Enter admin security PIN to access the live OPD queue, walk-in register, and delay radar.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput.trim()) {
                verifyPin(pinInput.trim());
              }
            }}
          >
            <label
              htmlFor="clinic-admin-pass"
              className="block font-semibold text-xs uppercase tracking-wider mb-2 text-charcoal"
            >
              Admin Security PIN
            </label>
            <input
              id="clinic-admin-pass"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              placeholder="Enter PIN (e.g. 1234)…"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError("");
              }}
              className="w-full text-sm p-3 border border-line rounded-xl bg-ground text-ink outline-none mb-3 transition-colors focus:bg-white focus:border-brand focus:ring-1 focus:ring-brand"
            />

            {pinError && (
              <div className="mb-3 text-xs font-semibold text-emergency">
                {pinError}
              </div>
            )}

            <button
              type="submit"
              className="w-full font-semibold text-sm rounded-xl py-3 px-5 bg-brand text-white hover:bg-brand-dark cursor-pointer transition-all active:scale-[0.99] shadow-2xs mb-4"
            >
              Unlock Admin Portal →
            </button>
          </form>

          <div className="border-t border-line pt-4 flex items-center justify-between text-xs text-muted">
            <Link href="/" className="text-charcoal font-medium hover:text-ink transition-colors underline decoration-line-strong hover:decoration-ink">
              ← Back to Website
            </Link>
            <span>Default PIN: 1234</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN TABLET WORKSPACE & DASHBOARD
  // ---------------------------------------------------------------------------
  const currentDoctorObj = doctorFilter === "all" ? null : allDoctors.find((d) => d.id === doctorFilter);
  const ownerReportText = formatDailyOwnerSummary(selectedDate, doctorFilter);
  const ownerWaUrl = `https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(ownerReportText)}`;

  return (
    <div className="min-w-0 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6 font-sans bg-ground">
      {/* Hidden file input for JSON restore */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileRestore}
        className="hidden"
      />

      {/* Screen View (hidden on print) */}
      <div className="no-print flex flex-col gap-6">
        {/* Top Header Bar */}
        <header className="rounded-3xl p-5 bg-white border border-line text-ink shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-xl bg-brand-tint ring-1 ring-brand-line/80 text-ink flex items-center justify-center font-bold">
              <StethoscopeIcon className="size-5 text-ink" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-ink font-display">
                  Admin &amp; Reception Portal
                </h1>
                {/* Cross-Device Sync Badge */}
                <button
                  type="button"
                  onClick={handleManualSync}
                  title="Click to manually sync cross-device"
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint/70 border border-brand-line text-ink text-[11px] px-2.5 py-0.5 font-semibold hover:bg-brand-tint transition-all"
                >
                  <span className={`size-1.5 rounded-full bg-[#22A05B] ${isSyncing ? "animate-spin" : "animate-pulse"}`} />
                  <span>{isSyncing ? "Syncing..." : `Sync: ${lastSyncDisplay}`}</span>
                </button>
              </div>
              <p className="text-xs text-muted mt-0.5">
                {clinic.name} · Opposite SDH Hospital, Sopore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Clock Badge */}
            <div className="hidden sm:flex flex-col text-right px-3 py-1.5 rounded-xl bg-ground border border-line font-mono">
              <span className="text-[10px] text-muted uppercase font-sans font-bold">Kashmir Time</span>
              <span className="text-xs font-bold text-ink">{fromMinutes(clock.minutes)} IST</span>
            </div>

            {/* Quick Walk-in Button */}
            <button
              type="button"
              onClick={() => {
                setShowWalkInModal(true);
                setWalkInDocId(doctorFilter !== "all" ? doctorFilter : allDoctors[0]?.id || "");
              }}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark shadow-2xs transition-all active:scale-95"
            >
              <span>+ Add Walk-In Patient</span>
            </button>

            {/* Logout Lock */}
            <button
              type="button"
              onClick={handleLogout}
              title="Lock Tablet"
              className="min-h-10 px-3.5 rounded-xl bg-white hover:bg-ground text-xs font-semibold text-charcoal transition-all border border-line-strong"
            >
              Lock Console
            </button>
          </div>
        </header>

        {/* Broadcast Toast Notification */}
        {broadcastToast && (
          <div className="rounded-2xl bg-brand text-white font-semibold text-xs sm:text-sm px-4 py-3 shadow-xs flex items-center justify-between animate-fade-in border border-night-line">
            <span className="flex items-center gap-2">
              <span className="text-mint">✓</span> {broadcastToast}
            </span>
            <button type="button" onClick={() => setBroadcastToast("")} className="text-mint hover:underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation Segmented Bar */}
        <nav className="flex gap-1.5 p-1.5 rounded-2xl bg-sand border border-line overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("opd")}
            className={`min-h-9 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "opd" ? "bg-brand text-white shadow-2xs font-semibold" : "text-muted hover:text-ink hover:bg-white/60"
            }`}
          >
            OPD Patient Queue
            {countWaiting > 0 && (
              <span className={`rounded-full text-[10px] px-1.5 py-0.2 font-bold ${
                activeTab === "opd"
                  ? "bg-brand-tint text-ink"
                  : "bg-brand-tint border border-brand-line text-ink"
              }`}>
                {countWaiting}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`min-h-9 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "radar" ? "bg-brand text-white shadow-2xs font-semibold" : "text-muted hover:text-ink hover:bg-white/60"
            }`}
          >
            Doctor Delay Radar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctors")}
            className={`min-h-9 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "doctors" ? "bg-brand text-white shadow-2xs font-semibold" : "text-muted hover:text-ink hover:bg-white/60"
            }`}
          >
            Doctor Timings &amp; Overrides
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("backups")}
            className={`min-h-9 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "backups" ? "bg-brand text-white shadow-2xs font-semibold" : "text-muted hover:text-ink hover:bg-white/60"
            }`}
          >
            Backups &amp; Owner Reports
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`min-h-9 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === "search" ? "bg-brand text-white shadow-2xs font-semibold" : "text-muted hover:text-ink hover:bg-white/60"
            }`}
          >
            Patient Search
          </button>
        </nav>

        {/* ===================================================================== */}
        {/* TAB 1: OPD PATIENT REGISTER                                          */}
        {/* ===================================================================== */}
        {activeTab === "opd" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Filter Controls Bar */}
            <div className="card rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-line shadow-2xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label htmlFor="date-select" className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    OPD Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm font-semibold text-ink bg-ground focus:bg-white focus:border-brand outline-none"
                  />
                </div>

                <div className="flex gap-1.5 self-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayKey)}
                    className={`min-h-10 px-3.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedDate === todayKey ? "bg-brand text-white shadow-2xs" : "bg-sand text-charcoal hover:bg-brand-tint"
                    }`}
                  >
                    Today
                  </button>
                </div>

                <div className="flex flex-col min-w-48">
                  <label htmlFor="doc-select" className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    Filter by Doctor
                  </label>
                  <select
                    id="doc-select"
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm font-semibold text-ink bg-ground focus:bg-white focus:border-brand outline-none"
                  >
                    <option value="all">All Specialists ({allDoctors.length})</option>
                    {allDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name ?? d.speciality} ({d.speciality})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Buttons: Excel Export, Print, and Owner Summary */}
              <div className="flex flex-wrap items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => downloadCsv(selectedDate)}
                  title="Download Excel spreadsheet of this day"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-brand-line bg-brand-tint/75 px-3.5 py-2 text-xs font-semibold text-ink hover:bg-brand-tint shadow-2xs transition-colors"
                >
                  📊 Export to Excel
                </button>

                <a
                  href={ownerWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={
                    doctorFilter === "all"
                      ? "Send All Doctors Daily Summary to Clinic Owner on WhatsApp"
                      : `Send ${currentDoctorObj?.name || "Doctor"} Daily Summary to Clinic Owner on WhatsApp`
                  }
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#20ba59] shadow-2xs"
                >
                  <WhatsAppIcon className="size-4" />
                  <span>
                    {doctorFilter === "all"
                      ? "Report All Doctors to Owner"
                      : `Report ${currentDoctorObj?.name?.replace(/^Dr\.\s*/, "") || "Doctor"} to Owner`}
                  </span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line-strong bg-white px-3.5 py-2 text-xs font-semibold text-ink hover:bg-ground shadow-2xs transition-colors"
                >
                  🖨️ Print Sheet
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="card rounded-3xl p-4 sm:p-5 border border-line bg-white shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Total Booked</span>
                <p className="text-3xl font-semibold tracking-tight text-ink mt-1 font-display tabular-nums">{filteredAppointments.length}</p>
                <div className="text-xs text-muted mt-1 flex flex-wrap gap-1">
                  <span className="font-semibold text-ink">{filteredAppointments.filter((a) => a.type === "online").length} Online</span>
                  <span>·</span>
                  <span className="font-semibold text-charcoal">{filteredAppointments.filter((a) => a.type === "walk_in").length} Walk-in</span>
                  {countCancelled > 0 && <span>· {countCancelled} Cancelled</span>}
                </div>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-line bg-white shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  Waiting in Lounge
                </span>
                <p className="text-3xl font-semibold tracking-tight text-ink mt-1 font-display tabular-nums">{countWaiting}</p>
                <span className="text-xs text-muted">Ready for consultation</span>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-night-line bg-brand text-white shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mint flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#DFF5CA]" />
                  In Cabin
                </span>
                <p className="text-3xl font-semibold tracking-tight text-white mt-1 font-display tabular-nums">{countInConsult}</p>
                <span className="text-xs text-night-muted">With the doctor now</span>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-brand-line bg-brand-tint/45 shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#22A05B]" />
                  Completed
                </span>
                <p className="text-3xl font-semibold tracking-tight text-ink mt-1 font-display tabular-nums">{countCompleted}</p>
                <span className="text-xs text-charcoal">Consultation finished</span>
              </div>
            </div>

            {/* Patient Queue Cards */}
            {filteredAppointments.length === 0 ? (
              <div className="card rounded-3xl p-12 text-center border border-dashed border-line-strong bg-white">
                <div className="size-14 rounded-2xl bg-brand-tint ring-1 ring-brand-line/80 text-ink flex items-center justify-center mx-auto mb-3.5">
                  <StethoscopeIcon className="size-7" />
                </div>
                <p className="text-lg font-semibold text-ink font-display">No patients scheduled yet for this date.</p>
                <p className="text-xs text-muted mt-1 max-w-md mx-auto leading-relaxed">
                  When patients book online or you register walk-ins via the <strong className="text-ink">&quot;+ Add Walk-In Patient&quot;</strong> button, they will appear in this live queue.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {filteredAppointments.map((apt) => {
                  const statusColors: Record<AppointmentStatus, string> = {
                    confirmed: "bg-amber-50 text-amber-900 border-amber-200",
                    arrived: "bg-sand text-ink border-line-strong",
                    in_consultation: "bg-brand text-mint border-brand",
                    completed: "bg-brand-tint text-ink border-brand-line",
                    cancelled: "bg-rose-50 text-rose-900 border-rose-200",
                  };

                  const callMsg = `Hello ${apt.patientName}, your token #${apt.token} for ${apt.doctorName} at Eternal Polyclinic, Sopore is now being called. Please proceed to Consultation Cabin.`;
                  const callWaUrl = `https://wa.me/91${apt.patientPhone}?text=${encodeURIComponent(callMsg)}`;

                  return (
                    <div
                      key={apt.token}
                      className={`card rounded-3xl p-4 sm:p-5 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        apt.status === "in_consultation"
                          ? "border-brand-line bg-brand-tint/25 ring-2 ring-brand-line/70 shadow-sm"
                          : "border-line bg-white hover:border-line-strong shadow-2xs"
                      }`}
                    >
                      {/* Left Block: Token Stub, Name, Address & Info */}
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        {/* Token Badge Stub */}
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-brand text-mint px-3 py-2 font-mono font-bold shrink-0 min-w-28 text-center shadow-2xs border border-night-line">
                          <span className="text-[10px] uppercase tracking-wider text-night-muted">Token</span>
                          <span className="text-base sm:text-lg font-bold tracking-wider text-mint">{apt.token}</span>
                          <span className="text-[11px] text-white/80 mt-0.5">{formatTime(apt.time)}</span>
                        </div>

                        {/* Patient Identity Block with prominent Village/Town Address */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-ink font-display">{apt.patientName}</span>

                            {/* Prominent Village / Town Address to avoid same-name confusion */}
                            {apt.patientAddress ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-tint/80 border border-brand-line text-ink px-2.5 py-0.5 text-xs font-semibold">
                                <span>📍</span> {apt.patientAddress}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-ground text-muted px-2 py-0.5 text-xs italic border border-line">
                                Area not added
                              </span>
                            )}

                            {/* Type Badge */}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                apt.type === "walk_in"
                                  ? "bg-ground text-charcoal border-line-strong"
                                  : "bg-brand-tint text-ink border-brand-line"
                              }`}
                            >
                              {apt.type === "walk_in" ? "Walk-In" : "Online"}
                            </span>
                          </div>

                          <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-charcoal">🩺 {apt.doctorName} ({apt.speciality})</span>
                            <span>·</span>
                            <span className="font-mono text-muted">📱 +91 {apt.patientPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Live Workflow Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line lg:border-t-0 lg:pt-0">
                        {/* Status Dropdown */}
                        <select
                          value={apt.status}
                          onChange={(e) => updateAppointmentStatus(apt.token, e.target.value as AppointmentStatus)}
                          className={`min-h-11 rounded-xl px-3 py-1.5 text-xs font-semibold border outline-none cursor-pointer ${statusColors[apt.status]}`}
                        >
                          <option value="confirmed">⏳ Confirmed (Waiting)</option>
                          <option value="arrived">🚶 Arrived in Clinic</option>
                          <option value="in_consultation">🩺 With Doctor (Cabin)</option>
                          <option value="completed">✅ Consultation Done</option>
                          <option value="cancelled">❌ Cancelled / No Show</option>
                        </select>

                        {/* WhatsApp Patient Call-In Alert */}
                        <a
                          href={callWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Message Patient on WhatsApp"
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#20ba59] shadow-2xs transition-all active:scale-95"
                        >
                          <WhatsAppIcon className="size-4" />
                          <span>Call In</span>
                        </a>

                        {/* Phone Call */}
                        <a
                          href={`tel:+91${apt.patientPhone}`}
                          title="Call Mobile Number"
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-ground px-3 py-1.5 text-xs font-semibold text-ink hover:bg-sand transition-colors"
                        >
                          <PhoneIcon className="size-4" />
                        </a>

                        {/* Cancel / Remove */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Cancel token ${apt.token} for ${apt.patientName}?`)) {
                              deleteAppointment(apt.token);
                            }
                          }}
                          title="Remove Token"
                          className="min-h-11 rounded-xl px-2.5 py-1.5 text-xs text-muted hover:text-emergency hover:bg-rose-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 2: LIVE DOCTOR DELAY RADAR                                       */}
        {/* ===================================================================== */}
        {activeTab === "radar" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="rounded-3xl p-6 bg-brand text-white shadow-sm border border-night-line">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mint mb-1">Real-Time Status</p>
              <h2 className="text-xl font-semibold text-white font-display">Live OPD Delay &amp; Arrival Radar</h2>
              <p className="text-xs sm:text-sm text-night-muted mt-1.5 max-w-3xl leading-relaxed">
                When a visiting specialist from Srinagar is travelling, delayed in surgery, or arrives at the clinic,
                update their status here. The website homepage immediately displays a live alert badge, and you can copy a 1-tap WhatsApp broadcast.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {allDoctors.map((doc) => {
                const live = doctorStatuses[doc.id] ?? getDoctorLiveStatus(doc.id);
                const broadcastMsg = doctorDelayBroadcastText(doc.name ?? doc.speciality, live, dateLabel(selectedDate));

                return (
                  <div key={doc.id} className="card rounded-3xl p-5 sm:p-6 border border-line flex flex-col justify-between gap-4 bg-white shadow-2xs">
                    <div>
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-ink font-display">{doc.name ?? doc.speciality}</h3>
                          <p className="text-xs text-muted font-medium mt-0.5">{doc.speciality} · {doc.degree}</p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                            live.state === "in_clinic"
                              ? "bg-brand-tint text-ink border border-brand-line"
                              : live.state === "delayed"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : live.state === "cancelled"
                              ? "bg-rose-50 text-rose-900 border border-rose-200"
                              : "bg-ground text-charcoal border border-line"
                          }`}
                        >
                          {live.state === "in_clinic"
                            ? "● In Clinic"
                            : live.state === "delayed"
                            ? `⚠️ Delayed (~${live.delayMinutes ?? 30}m)`
                            : live.state === "cancelled"
                            ? "🔴 Cancelled Today"
                            : "Scheduled"}
                        </span>
                      </div>

                      {/* State Switcher */}
                      <div className="flex flex-col gap-2 mt-4">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted">Live Doctor Status</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "scheduled")}
                            className={`min-h-11 rounded-xl text-xs font-semibold border transition-all ${
                              live.state === "scheduled" ? "bg-brand text-white border-brand shadow-2xs" : "border-line bg-white hover:bg-ground text-charcoal"
                            }`}
                          >
                            Scheduled
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "in_clinic")}
                            className={`min-h-11 rounded-xl text-xs font-semibold border transition-all ${
                              live.state === "in_clinic" ? "bg-brand-tint text-ink border-brand-line shadow-2xs font-bold" : "border-line bg-white hover:bg-brand-tint/40 text-ink"
                            }`}
                          >
                            🟢 In Clinic
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "delayed", live.delayMinutes || 30)}
                            className={`min-h-11 rounded-xl text-xs font-semibold border transition-all ${
                              live.state === "delayed" ? "bg-amber-500 text-white border-amber-500 shadow-2xs" : "border-line bg-white hover:bg-amber-50 text-amber-900"
                            }`}
                          >
                            🟡 Delayed
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "cancelled")}
                            className={`min-h-11 rounded-xl text-xs font-semibold border transition-all ${
                              live.state === "cancelled" ? "bg-rose-600 text-white border-rose-600 shadow-2xs" : "border-line bg-white hover:bg-rose-50 text-rose-800"
                            }`}
                          >
                            🔴 Cancelled
                          </button>
                        </div>
                      </div>

                      {/* Delay Configuration */}
                      {live.state === "delayed" && (
                        <div className="flex flex-col gap-2.5 rounded-2xl bg-amber-50/70 p-4 border border-amber-200 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-amber-900">Estimated Delay:</span>
                            <div className="flex gap-1">
                              {[15, 30, 45, 60, 90].map((min) => (
                                <button
                                  key={min}
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "delayed", min)}
                                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
                                    (live.delayMinutes ?? 30) === min
                                      ? "bg-amber-600 text-white"
                                      : "bg-white text-amber-900 border border-amber-300 hover:bg-amber-100"
                                  }`}
                                >
                                  {min}m
                                </button>
                              ))}
                            </div>
                          </div>

                          <input
                            type="text"
                            placeholder="Reason (e.g. Traffic near Sangrama / SKIMS surgery)"
                            value={live.note ?? ""}
                            onChange={(e) => updateDoctorRadar(doc.id, "delayed", live.delayMinutes, e.target.value)}
                            className="min-h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs text-ink outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Broadcast WhatsApp Preview & Copy */}
                    {broadcastMsg && (
                      <div className="flex flex-col gap-2 border-t border-line pt-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-muted uppercase tracking-wider">WhatsApp Broadcast Notice:</span>
                          <button
                            type="button"
                            onClick={() => copyBroadcast(broadcastMsg)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline decoration-brand-line hover:decoration-ink"
                          >
                            📋 Copy Message
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-xl bg-ground p-3 text-[11px] text-charcoal border border-line font-sans leading-relaxed">
                          {broadcastMsg}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 3: DOCTOR TIMINGS & LEAVE MANAGER                                 */}
        {/* ===================================================================== */}
        {activeTab === "doctors" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-4 card rounded-3xl p-5 border border-line shadow-2xs">
              <div>
                <h2 className="text-xl font-semibold text-ink font-display">OPD Days &amp; Timings Management</h2>
                <p className="text-xs text-muted mt-0.5">
                  Update doctor sitting days, mark doctors on leave, or register a new visiting specialist.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark shadow-2xs transition-all"
              >
                + Register New Specialist
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {allDoctors.map((doc) => {
                const isOnLeave = doc.availability?.toLowerCase().includes("leave");

                return (
                  <div key={doc.id} className="card rounded-3xl p-5 border border-line flex flex-col justify-between gap-4 shadow-2xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-semibold text-ink font-display">{doc.name ?? doc.speciality}</h3>
                          <p className="text-xs text-muted font-medium mt-0.5">{doc.speciality} · {doc.degree}</p>
                        </div>

                        {isOnLeave ? (
                          <span className="rounded-lg bg-rose-50 text-rose-800 text-xs px-2.5 py-0.5 font-semibold border border-rose-200">
                            On Leave
                          </span>
                        ) : (
                          <span className="rounded-lg bg-brand-tint text-ink text-xs px-2.5 py-0.5 font-semibold border border-brand-line">
                            Active OPD
                          </span>
                        )}
                      </div>

                      {/* OPD Sessions */}
                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-charcoal">
                        <span className="font-bold text-muted uppercase text-[10px] tracking-wider">Sitting Schedule:</span>
                        {doc.opd.length > 0 ? (
                          doc.opd.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center rounded-xl bg-ground px-3 py-1.5 border border-line">
                              <span className="font-semibold text-ink">{DAY_NAMES[s.day]}</span>
                              <span className="font-medium text-muted">{formatTime(s.start)} – {formatTime(s.end)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted italic">No scheduled weekly OPD. By appointment.</p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Toggle Leave + Delete / Preview */}
                    <div className="border-t border-line pt-3 flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newLeave = !isOnLeave;
                            setDoctorOverride(doc.id, { onLeave: newLeave });
                          }}
                          className={`min-h-9 px-3 rounded-lg text-xs font-semibold transition-all ${
                            isOnLeave
                              ? "bg-brand-tint text-ink border border-brand-line hover:bg-[#D1EFB5]"
                              : "bg-ground text-emergency border border-line hover:bg-rose-50"
                          }`}
                        >
                          {isOnLeave ? "End Leave (Active)" : "Mark On Leave"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to deactivate/remove ${doc.name ?? doc.speciality} from the active clinic roster?`)) {
                              removeCustomDoctor(doc.id);
                              // Also mark on leave as a soft deactivation for default doctors
                              setDoctorOverride(doc.id, { onLeave: true });
                              setBroadcastToast(`Dr. ${doc.name ?? doc.speciality} removed/deactivated.`);
                              setTimeout(() => setBroadcastToast(""), 3500);
                            }
                          }}
                          className="min-h-9 px-2.5 rounded-lg text-xs font-semibold text-muted hover:text-emergency hover:bg-rose-50 transition-colors"
                          title="Remove doctor from active roster"
                        >
                          Remove
                        </button>
                      </div>

                      <Link
                        href={`/book?doctor=${doc.id}`}
                        target="_blank"
                        className="text-xs text-ink font-semibold underline decoration-brand-line hover:decoration-ink"
                      >
                        Preview Booking →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: DAILY BACKUPS, CLOUD SYNC & OWNER REPORTING                    */}
        {/* ===================================================================== */}
        {activeTab === "backups" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Owner Daily Report Card */}
            <div className="rounded-3xl p-6 border border-night-line bg-brand text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-mint">
                  <WhatsAppIcon className="size-3.5" /> 1-Tap WhatsApp to Owner
                </span>
                <h3 className="text-xl font-semibold font-display text-white">Daily OPD Summary for Clinic Owner</h3>
                <p className="text-xs text-night-muted max-w-xl leading-relaxed">
                  Send today&apos;s total patient counts, completed visits, and doctor breakdowns directly to the owner&apos;s WhatsApp with one tap at closing time.
                </p>
              </div>

              <a
                href={ownerWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-semibold text-white hover:bg-[#20ba59] shadow-sm transition-all shrink-0 active:scale-95"
              >
                <WhatsAppIcon className="size-5" />
                <span>
                  {doctorFilter === "all"
                    ? "Send All Doctors Report to Owner"
                    : `Send ${currentDoctorObj?.name || "Doctor"} Report to Owner`}
                </span>
              </a>
            </div>

            {/* Quick Actions Grid: Excel & JSON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full JSON Backup */}
              <div className="card rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between gap-4 bg-white">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">💾</span>
                    <h4 className="text-base font-semibold text-ink font-display">Full Clinic JSON Database Backup</h4>
                  </div>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    Downloads an encrypted complete backup file of all appointments, walk-ins, doctor schedule overrides, and custom specialists.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={downloadFullJsonBackup}
                    className="flex-1 min-h-11 rounded-xl bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-all shadow-2xs"
                  >
                    📥 Download Backup File (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => restoreFileInputRef.current?.click()}
                    className="min-h-11 px-4 rounded-xl border border-line bg-ground text-charcoal text-xs font-semibold hover:bg-sand transition-all"
                  >
                    🔄 Restore Backup
                  </button>
                </div>
              </div>

              {/* Cross-Device Cloud Sync */}
              <div className="card rounded-3xl p-5 border border-line shadow-2xs flex flex-col justify-between gap-4 bg-white">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🛰️</span>
                    <h4 className="text-base font-semibold text-ink font-display">Cross-Device Live Sync Status</h4>
                  </div>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    Synchronizes real-time appointments across all clinic tablets, receptionist phones, and patient booking channels.
                  </p>
                  <p className="text-xs font-semibold text-ink mt-1.5">
                    Last Synced: <span className="text-charcoal">{lastSyncDisplay}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    className="w-full min-h-11 rounded-xl bg-brand-tint border border-brand-line text-ink text-xs font-semibold hover:bg-[#D1EFB5] transition-all shadow-2xs"
                  >
                    🔄 Force Cloud Sync Now
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Archive Table */}
            <div className="card rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-4 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h4 className="text-base font-semibold text-ink font-display">Historical OPD Records by Date</h4>
                  <p className="text-xs text-muted">Download past days into individual Excel / CSV sheets.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsv()}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline decoration-brand-line hover:decoration-ink"
                >
                  📥 Export Complete All-Time CSV
                </button>
              </div>

              {allRecordedDates.length === 0 ? (
                <p className="text-xs text-muted py-4 text-center">No past records stored yet.</p>
              ) : (
                <div className="flex flex-col divide-y divide-line">
                  {allRecordedDates.map((dateKey) => {
                    const dayApts = dateGroups[dateKey] || [];
                    const completed = dayApts.filter((a) => a.status === "completed").length;

                    return (
                      <div key={dateKey} className="py-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-ink">{dateLabel(dateKey)}</span>
                            <span className="text-xs text-muted font-mono">({dateKey})</span>
                          </div>
                          <p className="text-xs text-muted mt-0.5">
                            {dayApts.length} patient{dayApts.length > 1 ? "s" : ""} · {completed} completed
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadCsv(dateKey)}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand-line bg-brand-tint/75 px-3 py-1.5 text-xs font-semibold text-ink hover:bg-brand-tint transition-colors"
                          >
                            📊 Download Excel (.csv)
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 5: PATIENT SEARCH WITH VILLAGE/ADDRESS MATCHING                   */}
        {/* ===================================================================== */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className="card rounded-3xl p-5 border border-line shadow-2xs flex flex-col gap-3">
              <label htmlFor="search-input" className="text-lg font-semibold text-ink font-display">
                Find Patient Record by Name, Village/Area, Phone, or Token
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-line px-4 bg-ground focus-within:border-brand focus-within:bg-white transition-all">
                <SearchIcon className="size-5 text-muted" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="e.g. Ghulam Mohammad, Tarzoo, Dangerpora, 97977... or EP-AK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-13 bg-transparent text-base text-ink outline-none font-medium"
                />
              </div>
            </div>

            {searchQuery.trim() && (
              <div className="flex flex-col gap-3">
                {appointments
                  .filter((a) => {
                    const q = searchQuery.toLowerCase();
                    return (
                      a.patientName.toLowerCase().includes(q) ||
                      (a.patientAddress && a.patientAddress.toLowerCase().includes(q)) ||
                      a.patientPhone.includes(q) ||
                      a.token.toLowerCase().includes(q)
                    );
                  })
                  .map((a) => (
                    <div key={a.token} className="card rounded-3xl p-4 sm:p-5 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-mint bg-brand px-2.5 py-0.5 rounded-md text-xs">{a.token}</span>
                          <span className="font-semibold text-ink text-base">{a.patientName}</span>
                          {a.patientAddress && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint border border-brand-line text-ink px-2 py-0.5 text-xs font-semibold">
                              📍 {a.patientAddress}
                            </span>
                          )}
                          <span className="text-xs text-muted font-mono">(+91 {a.patientPhone})</span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          {a.doctorName} ({a.speciality}) · {dateLabel(a.date)} at {formatTime(a.time)} · Status: <strong className="text-ink">{a.status}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:+91${a.patientPhone}`}
                          className="min-h-10 px-3.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <PhoneIcon className="size-3.5" /> Call
                        </a>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 1-TAP WALK-IN PATIENT ENTRY MODAL (WITH VILLAGE / ADDRESS FIELD)        */}
      {/* ======================================================================= */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-5 max-h-[90vh] overflow-y-auto bg-white">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-semibold text-ink font-display">Register Walk-in Patient</h3>
                <p className="text-xs text-muted">Locks the slot instantly to prevent double-booking.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="size-8 rounded-full bg-ground flex items-center justify-center font-bold text-charcoal hover:bg-sand"
              >
                ✕
              </button>
            </div>

            {walkInError && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-800 border border-rose-200">
                {walkInError}
              </p>
            )}

            <div className="flex flex-col gap-4">
              {/* Doctor */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-doc" className="text-xs font-bold uppercase tracking-wider text-muted">Consultant Specialist</label>
                <select
                  id="walkin-doc"
                  value={walkInDocId}
                  onChange={(e) => {
                    setWalkInDocId(e.target.value);
                    setWalkInTime("");
                  }}
                  className="min-h-12 rounded-xl border border-line px-3 text-sm sm:text-base font-semibold text-ink bg-ground focus:bg-white focus:border-brand outline-none"
                >
                  <option value="">Select Doctor</option>
                  {allDoctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name ?? d.speciality} ({d.speciality})
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slots */}
              {walkInDocId && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted">
                    Select Available Slot ({dateLabel(selectedDate)})
                  </label>
                  {(() => {
                    const doc = allDoctors.find((d) => d.id === walkInDocId);
                    if (!doc) return null;
                    const slots = timeSlots(doc, selectedDate, now);
                    const taken = getBookedSlots(doc.id, selectedDate);

                    return (
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1.5 border border-line rounded-xl bg-ground">
                        {slots.map((s) => {
                          const isOccupied = taken.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setWalkInTime(s)}
                              className={`min-h-10 rounded-lg text-xs font-semibold border transition-all ${
                                isOccupied
                                  ? "bg-sand text-muted/60 border-line cursor-not-allowed line-through"
                                  : walkInTime === s
                                  ? "bg-brand text-white border-brand shadow-2xs"
                                  : "bg-white text-ink border-line hover:border-line-strong"
                              }`}
                            >
                              {formatTime(s)}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Patient Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-name" className="text-xs font-bold uppercase tracking-wider text-muted">Patient Full Name</label>
                <input
                  id="walkin-name"
                  type="text"
                  placeholder="e.g. Ghulam Mohammad"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="min-h-12 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-4 text-base font-medium text-ink"
                />
              </div>

              {/* Patient Village / Address (Crucial for disambiguating identical names) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label htmlFor="walkin-address" className="text-xs font-bold uppercase tracking-wider text-muted">
                    Village / Town / Address
                  </label>
                  <span className="text-[11px] text-charcoal font-semibold">Prevents same-name confusion</span>
                </div>
                <input
                  id="walkin-address"
                  type="text"
                  placeholder="e.g. Tarzoo, Dangerpora, Sangrama, Sopore"
                  value={walkInAddress}
                  onChange={(e) => setWalkInAddress(e.target.value)}
                  className="min-h-12 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-4 text-base font-medium text-ink"
                />
              </div>

              {/* Patient Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-phone" className="text-xs font-bold uppercase tracking-wider text-muted">Mobile Number (10 Digits)</label>
                <div className="flex rounded-xl border border-line overflow-hidden bg-ground focus-within:bg-white focus-within:border-brand">
                  <span className="bg-sand px-3.5 py-3 text-sm font-semibold text-charcoal border-r border-line">+91</span>
                  <input
                    id="walkin-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit number"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="flex-1 bg-transparent px-4 min-h-12 text-base font-medium text-ink outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="flex-1 min-h-12 rounded-2xl border border-line text-charcoal font-semibold hover:bg-ground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWalkIn}
                className="flex-1 min-h-12 rounded-2xl bg-brand text-white font-semibold hover:bg-brand-dark shadow-2xs transition-colors"
              >
                Issue Token Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* WALK-IN SUCCESS TOKEN SLIP POPUP                                       */}
      {/* ======================================================================= */}
      {walkInSuccessSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-brand-line flex flex-col gap-4 text-center bg-white">
            <span className="text-4xl">🎟️</span>
            <div>
              <span className="inline-block rounded-full bg-brand-tint border border-brand-line px-3 py-0.5 text-xs font-semibold uppercase text-ink">Official Token Slip Issued</span>
              <h3 className="text-3xl font-bold font-mono tracking-wider text-ink mt-2 font-display">
                {walkInSuccessSlip.token}
              </h3>
            </div>

            <div className="rounded-2xl bg-ground p-4 text-left text-xs space-y-1.5 border border-line text-charcoal">
              <p><strong className="text-ink">Patient:</strong> {walkInSuccessSlip.patientName}</p>
              {walkInSuccessSlip.patientAddress && (
                <p className="text-ink font-semibold"><strong>Village / Area:</strong> 📍 {walkInSuccessSlip.patientAddress}</p>
              )}
              <p><strong className="text-ink">Doctor:</strong> {walkInSuccessSlip.doctorName}</p>
              <p><strong className="text-ink">Slot:</strong> {formatTime(walkInSuccessSlip.time)}</p>
              <p><strong className="text-ink">Date:</strong> {dateLabel(walkInSuccessSlip.date)}</p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-12 rounded-2xl bg-brand text-white font-semibold text-xs hover:bg-brand-dark"
              >
                🖨️ Print Slip
              </button>
              <button
                type="button"
                onClick={() => setWalkInSuccessSlip(null)}
                className="flex-1 min-h-12 rounded-2xl border border-line text-ink font-semibold text-xs hover:bg-ground"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* REGISTER NEW SPECIALIST MODAL                                          */}
      {/* ======================================================================= */}
      {showNewDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-4 bg-white">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-semibold text-ink font-display">Add Visiting Specialist</h3>
                <p className="text-xs text-muted">Register doctor details and sitting schedule.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="size-8 rounded-full bg-ground flex items-center justify-center font-bold text-charcoal hover:bg-sand"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="new-doc-name" className="text-xs font-bold uppercase text-muted">Doctor Full Name</label>
                <input
                  id="new-doc-name"
                  type="text"
                  placeholder="e.g. Dr. Shabir Ahmad"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-3 text-sm font-medium text-ink mt-1"
                />
              </div>

              <div>
                <label htmlFor="new-doc-spec" className="text-xs font-bold uppercase text-muted">Speciality</label>
                <input
                  id="new-doc-spec"
                  type="text"
                  placeholder="e.g. Orthopedics & Joint Replacement"
                  value={newDocSpec}
                  onChange={(e) => setNewDocSpec(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-3 text-sm font-medium text-ink mt-1"
                />
              </div>

              <div>
                <label htmlFor="new-doc-degree" className="text-xs font-bold uppercase text-muted">Degree &amp; Credentials</label>
                <input
                  id="new-doc-degree"
                  type="text"
                  placeholder="e.g. MBBS, MS Ortho, Former SKIMS"
                  value={newDocDegree}
                  onChange={(e) => setNewDocDegree(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-3 text-sm font-medium text-ink mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="new-doc-day" className="text-xs font-bold uppercase text-muted">OPD Day</label>
                  <select
                    id="new-doc-day"
                    value={newDocDay}
                    onChange={(e) => setNewDocDay(Number(e.target.value))}
                    className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-2 text-xs font-semibold text-ink mt-1"
                  >
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="new-doc-start" className="text-xs font-bold uppercase text-muted">Start Time</label>
                  <input
                    id="new-doc-start"
                    type="time"
                    value={newDocStart}
                    onChange={(e) => setNewDocStart(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-2 text-xs font-semibold text-ink mt-1"
                  />
                </div>

                <div>
                  <label htmlFor="new-doc-end" className="text-xs font-bold uppercase text-muted">End Time</label>
                  <input
                    id="new-doc-end"
                    type="time"
                    value={newDocEnd}
                    onChange={(e) => setNewDocEnd(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-line bg-ground focus:bg-white focus:border-brand outline-none px-2 text-xs font-semibold text-ink mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="flex-1 min-h-11 rounded-2xl border border-line text-charcoal font-semibold text-sm hover:bg-ground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewDoctor}
                className="flex-1 min-h-11 rounded-2xl bg-brand text-white font-semibold text-sm hover:bg-brand-dark"
              >
                Save Doctor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
