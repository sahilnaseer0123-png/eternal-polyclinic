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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("ep_reception_auth") === "true";
  });
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

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

  function handlePinDigit(digit: string) {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  }

  function handlePinBackspace() {
    setPinInput((prev) => prev.slice(0, -1));
    setPinError("");
  }

  // Keyboard typing support for physical keyboards & laptop keypads
  useEffect(() => {
    if (isAuthenticated) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement &&
        e.target.id !== "kiosk-pin-hidden-input"
      ) {
        return;
      }
      if (e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setPinInput((prev) => {
          if (prev.length < 4) {
            const next = prev + e.key;
            if (next.length === 4) {
              verifyPin(next);
            }
            return next;
          }
          return prev;
        });
      } else if (e.key === "Backspace") {
        e.preventDefault();
        setPinInput((prev) => prev.slice(0, -1));
        setPinError("");
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        setPinInput("");
        setPinError("");
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (pinInput.length === 4) {
          verifyPin(pinInput);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthenticated, pinInput]);

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
      registrationNo: null,
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
  // ULTRA-MODERN KIOSK PIN GATE SCREEN
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[85vh] flex-col items-center justify-center px-4 py-8 bg-gradient-to-br from-slate-950 via-ink to-slate-900 text-white">
        <div className="w-full max-w-sm rounded-3xl p-6 sm:p-8 bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center text-center gap-6 animate-fade-in">
          {/* Clinic Emblem */}
          <div className="relative">
            <div className="size-20 rounded-3xl bg-gradient-to-tr from-brand to-teal-400 p-0.5 shadow-lg shadow-teal-500/20">
              <div className="size-full rounded-[22px] bg-slate-950 flex items-center justify-center">
                <StethoscopeIcon className="size-10 text-glow" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex size-5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex size-5 rounded-full bg-emerald-500 border-2 border-slate-950"></span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">Eternal Polyclinic</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Reception Tablet Portal · Sopore</p>
          </div>

          {/* PIN Indicators & Keyboard Capture */}
          <div className="flex flex-col items-center gap-2 relative w-full">
            <input
              id="kiosk-pin-hidden-input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPinInput(val);
                if (val.length === 4) {
                  verifyPin(val);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-text w-full h-full"
              aria-label="Enter 4-digit PIN with your keyboard"
            />
            <div className="flex gap-4 my-2 pointer-events-none">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`size-4 rounded-full transition-all duration-200 ${
                      filled
                        ? "bg-glow scale-125 shadow-md shadow-teal-400/50"
                        : "bg-white/20 border border-white/30"
                    }`}
                  />
                );
              })}
            </div>
            {pinError ? (
              <p className="text-xs font-semibold text-rose-400 animate-shake">{pinError}</p>
            ) : (
              <p className="text-[11px] text-slate-300">
                Type <span className="font-bold font-mono text-glow">1234</span> on keyboard or tap number pad
              </p>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinDigit(String(num))}
                className="size-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-brand text-2xl font-bold font-mono text-white transition-all duration-100 flex items-center justify-center shadow-xs mx-auto active:scale-95"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPinInput("")}
              className="size-16 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 transition-all flex items-center justify-center mx-auto"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handlePinDigit("0")}
              className="size-16 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-brand text-2xl font-bold font-mono text-white transition-all flex items-center justify-center mx-auto active:scale-95"
            >
              0
            </button>

            <button
              type="button"
              onClick={handlePinBackspace}
              className="size-16 rounded-2xl bg-white/5 hover:bg-white/10 text-base font-bold text-slate-300 transition-all flex items-center justify-center mx-auto"
            >
              ⌫
            </button>
          </div>

          <div className="text-[11px] text-slate-500 border-t border-white/10 pt-3 w-full">
            Reception Desk Tablet System · Opposite SDH Hospital
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN TABLET WORKSPACE & DASHBOARD
  // ---------------------------------------------------------------------------
  const ownerReportText = formatDailyOwnerSummary(selectedDate);
  const ownerWaUrl = `https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(ownerReportText)}`;

  return (
    <div className="min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6 font-sans">
      {/* Hidden file input for JSON restore */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileRestore}
        className="hidden"
      />

      {/* Printable OPD Register Sheet (Visible only when printing) */}
      <div className="hidden print:block print-only">
        <div className="border-b-2 border-black pb-4 mb-4">
          <div className="flex justify-between items-baseline">
            <h1 className="text-2xl font-black text-black uppercase">{clinic.name} — OPD Register</h1>
            <span className="text-sm font-bold">Reception Helpline: 97977 96909</span>
          </div>
          <p className="text-xs text-gray-700">{clinic.address}</p>
          <div className="mt-3 flex justify-between text-xs font-bold border-t border-gray-300 pt-2">
            <span>Date: {dateLabel(selectedDate)}</span>
            <span>Doctor: {doctorFilter === "all" ? "All Specialists" : allDoctors.find((d) => d.id === doctorFilter)?.name}</span>
            <span>Total Patients: {filteredAppointments.length}</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-gray-400 text-xs">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400 font-bold">
              <th className="border border-gray-400 p-2">Token #</th>
              <th className="border border-gray-400 p-2">Time</th>
              <th className="border border-gray-400 p-2">Patient Name</th>
              <th className="border border-gray-400 p-2">Village / Address</th>
              <th className="border border-gray-400 p-2">Mobile</th>
              <th className="border border-gray-400 p-2">Type</th>
              <th className="border border-gray-400 p-2">Status</th>
              <th className="border border-gray-400 p-2 w-44">Consultation Notes / Rx</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((apt) => (
              <tr key={apt.token} className="border-b border-gray-300">
                <td className="border border-gray-400 p-2 font-mono font-bold">{apt.token}</td>
                <td className="border border-gray-400 p-2 font-bold">{formatTime(apt.time)}</td>
                <td className="border border-gray-400 p-2 font-bold text-black">{apt.patientName}</td>
                <td className="border border-gray-400 p-2 font-semibold text-gray-800">{apt.patientAddress || "—"}</td>
                <td className="border border-gray-400 p-2 font-mono">{apt.patientPhone}</td>
                <td className="border border-gray-400 p-2 capitalize">{apt.type}</td>
                <td className="border border-gray-400 p-2 capitalize font-semibold">{apt.status}</td>
                <td className="border border-gray-400 p-2"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen View (hidden on print) */}
      <div className="no-print flex flex-col gap-6">
        {/* Top Header Bar */}
        <header className="rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-ink to-slate-950 text-white shadow-xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-teal-500/20 text-glow flex items-center justify-center font-bold border border-teal-500/30 shadow-inner">
              <StethoscopeIcon className="size-6 text-glow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight sm:text-2xl font-display text-white">
                  Reception Tablet Suite
                </h1>
                {/* Cross-Device Sync Badge */}
                <button
                  type="button"
                  onClick={handleManualSync}
                  title="Click to manually sync cross-device"
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] px-2.5 py-0.5 font-bold hover:bg-emerald-500/30 transition-all"
                >
                  <span className={`size-1.5 rounded-full bg-emerald-400 ${isSyncing ? "animate-spin" : "animate-pulse"}`} />
                  <span>{isSyncing ? "Syncing..." : `Cloud Sync: ${lastSyncDisplay}`}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {clinic.name} · Opposite SDH Hospital, Sopore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock Badge */}
            <div className="hidden sm:flex flex-col text-right px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono">
              <span className="text-[10px] text-slate-400 uppercase font-sans font-bold">Clinic Time</span>
              <span className="text-sm font-bold text-glow">{fromMinutes(clock.minutes)} IST</span>
            </div>

            {/* Quick Walk-in Button */}
            <button
              type="button"
              onClick={() => {
                setShowWalkInModal(true);
                setWalkInDocId(doctorFilter !== "all" ? doctorFilter : allDoctors[0]?.id || "");
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm sm:text-base font-black text-white hover:brightness-110 shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
            >
              <span>➕ Add Walk-In</span>
            </button>

            {/* Logout Lock */}
            <button
              type="button"
              onClick={handleLogout}
              title="Lock Tablet"
              className="min-h-12 px-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-xs font-bold text-slate-300 transition-all border border-white/10"
            >
              🔒 Lock
            </button>
          </div>
        </header>

        {/* Broadcast Toast Notification */}
        {broadcastToast && (
          <div className="rounded-2xl bg-emerald-600 text-white font-bold text-sm px-4 py-3 shadow-lg flex items-center justify-between animate-fade-in border border-emerald-400/40">
            <span className="flex items-center gap-2">
              <span>✅</span> {broadcastToast}
            </span>
            <button type="button" onClick={() => setBroadcastToast("")} className="text-white hover:underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigation Segmented Bar */}
        <nav className="flex gap-2 p-1.5 rounded-2xl bg-slate-100 border border-line overflow-x-auto text-sm font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("opd")}
            className={`min-h-11 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "opd" ? "bg-ink text-white shadow-md shadow-ink/20" : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            📋 OPD Patient Register
            {countWaiting > 0 && (
              <span className="rounded-full bg-amber-400 text-ink text-xs px-2 py-0.5 font-black">
                {countWaiting}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("radar")}
            className={`min-h-11 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "radar" ? "bg-ink text-white shadow-md shadow-ink/20" : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            🛰️ Doctor Delay Radar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctors")}
            className={`min-h-11 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "doctors" ? "bg-ink text-white shadow-md shadow-ink/20" : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            🩺 Doctor Timings & Leaves
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("backups")}
            className={`min-h-11 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "backups" ? "bg-ink text-white shadow-md shadow-ink/20" : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            💾 Daily Backups & Reports
            <span className="rounded-full bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 font-bold">
              New
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`min-h-11 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "search" ? "bg-ink text-white shadow-md shadow-ink/20" : "text-slate-600 hover:text-ink hover:bg-white/60"
            }`}
          >
            🔍 Patient Search
          </button>
        </nav>

        {/* ===================================================================== */}
        {/* TAB 1: OPD PATIENT REGISTER                                          */}
        {/* ===================================================================== */}
        {activeTab === "opd" && (
          <div className="flex flex-col gap-6 animate-fade-in">
            {/* Filter Controls Bar */}
            <div className="card rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-line shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label htmlFor="date-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    OPD Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm font-bold bg-slate-50 focus:border-brand outline-none"
                  />
                </div>

                <div className="flex gap-1.5 self-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayKey)}
                    className={`min-h-10 px-3.5 rounded-xl text-xs font-bold transition-all ${
                      selectedDate === todayKey ? "bg-brand text-white shadow-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Today
                  </button>
                </div>

                <div className="flex flex-col min-w-48">
                  <label htmlFor="doc-select" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Filter by Doctor
                  </label>
                  <select
                    id="doc-select"
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm font-bold bg-slate-50 focus:border-brand outline-none"
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
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs"
                >
                  📊 Export to Excel
                </button>

                <a
                  href={ownerWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Send Daily Summary to Clinic Owner on WhatsApp"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#20ba59] shadow-xs"
                >
                  <WhatsAppIcon className="size-4" />
                  <span>Report to Owner</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs"
                >
                  🖨️ Print Sheet
                </button>
              </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="card rounded-3xl p-4 sm:p-5 border border-line/90 bg-white shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Booked</span>
                <p className="text-3xl font-black text-ink mt-1 font-display">{filteredAppointments.length}</p>
                <div className="text-xs text-muted mt-1 flex flex-wrap gap-1">
                  <span className="font-semibold text-slate-700">{filteredAppointments.filter((a) => a.type === "online").length} Online</span>
                  <span>·</span>
                  <span className="font-semibold text-teal-700">{filteredAppointments.filter((a) => a.type === "walk_in").length} Walk-in</span>
                  {countCancelled > 0 && <span>· {countCancelled} Cancelled</span>}
                </div>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-amber-200 bg-amber-50/40 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                  Waiting in Lounge
                </span>
                <p className="text-3xl font-black text-amber-900 mt-1 font-display">{countWaiting}</p>
                <span className="text-xs text-amber-700">Ready for consultation</span>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-purple-200 bg-purple-50/40 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-purple-500" />
                  In Cabin
                </span>
                <p className="text-3xl font-black text-purple-900 mt-1 font-display">{countInConsult}</p>
                <span className="text-xs text-purple-700">With the doctor now</span>
              </div>

              <div className="card rounded-3xl p-4 sm:p-5 border border-emerald-200 bg-emerald-50/40 shadow-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  Completed
                </span>
                <p className="text-3xl font-black text-emerald-900 mt-1 font-display">{countCompleted}</p>
                <span className="text-xs text-emerald-700">Consultation finished</span>
              </div>
            </div>

            {/* Patient Queue Cards */}
            {filteredAppointments.length === 0 ? (
              <div className="card rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="size-16 rounded-3xl bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <StethoscopeIcon className="size-8" />
                </div>
                <p className="text-lg font-bold text-slate-700 font-display">No patients scheduled yet for this date.</p>
                <p className="text-xs text-muted mt-1 max-w-md mx-auto">
                  When patients book online or you register walk-ins via the <strong>&quot;➕ Add Walk-In&quot;</strong> button, they will appear in this live queue.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {filteredAppointments.map((apt) => {
                  const statusColors: Record<AppointmentStatus, string> = {
                    confirmed: "bg-amber-100 text-amber-900 border-amber-300",
                    arrived: "bg-sky-100 text-sky-900 border-sky-300",
                    in_consultation: "bg-purple-100 text-purple-900 border-purple-300",
                    completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
                    cancelled: "bg-rose-100 text-rose-900 border-rose-300",
                  };

                  const callMsg = `Hello ${apt.patientName}, your token #${apt.token} for ${apt.doctorName} at Eternal Polyclinic, Sopore is now being called. Please proceed to Consultation Cabin.`;
                  const callWaUrl = `https://wa.me/91${apt.patientPhone}?text=${encodeURIComponent(callMsg)}`;

                  return (
                    <div
                      key={apt.token}
                      className={`card rounded-3xl p-4 sm:p-5 border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        apt.status === "in_consultation"
                          ? "border-purple-400/80 bg-purple-50/30 ring-2 ring-purple-300/60 shadow-md"
                          : "border-line bg-white hover:border-slate-300 shadow-xs"
                      }`}
                    >
                      {/* Left Block: Token Stub, Name, Address & Info */}
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        {/* Token Badge Stub */}
                        <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-950 text-glow px-3 py-2 font-mono font-bold shrink-0 min-w-28 text-center shadow-xs border border-slate-800">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400">Token</span>
                          <span className="text-base sm:text-lg font-black tracking-wider text-glow">{apt.token}</span>
                          <span className="text-[11px] text-slate-300 mt-0.5">{formatTime(apt.time)}</span>
                        </div>

                        {/* Patient Identity Block with prominent Village/Town Address */}
                        <div className="flex flex-col min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black text-ink font-display">{apt.patientName}</span>

                            {/* Prominent Village / Town Address to avoid same-name confusion */}
                            {apt.patientAddress ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 px-2.5 py-0.5 text-xs font-bold">
                                <span>📍</span> {apt.patientAddress}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 text-slate-500 px-2 py-0.5 text-xs italic">
                                Area not added
                              </span>
                            )}

                            {/* Type Badge */}
                            <span
                              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase border ${
                                apt.type === "walk_in"
                                  ? "bg-teal-50 text-teal-800 border-teal-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {apt.type === "walk_in" ? "Walk-In" : "Online"}
                            </span>
                          </div>

                          <div className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-semibold text-slate-700">🩺 {apt.doctorName} ({apt.speciality})</span>
                            <span>·</span>
                            <span className="font-mono text-slate-600">📱 +91 {apt.patientPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Block: Live Workflow Controls */}
                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line/60 lg:border-t-0 lg:pt-0">
                        {/* Status Dropdown */}
                        <select
                          value={apt.status}
                          onChange={(e) => updateAppointmentStatus(apt.token, e.target.value as AppointmentStatus)}
                          className={`min-h-11 rounded-xl px-3 py-1.5 text-xs font-bold border outline-none cursor-pointer ${statusColors[apt.status]}`}
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
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#20ba59] shadow-xs transition-all active:scale-95"
                        >
                          <WhatsAppIcon className="size-4" />
                          <span>Call In</span>
                        </a>

                        {/* Phone Call */}
                        <a
                          href={`tel:+91${apt.patientPhone}`}
                          title="Call Mobile Number"
                          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
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
                          className="min-h-11 rounded-xl px-2.5 py-1.5 text-xs text-slate-400 hover:text-emergency hover:bg-rose-50 transition-colors"
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
            <div className="rounded-3xl p-6 bg-gradient-to-r from-teal-950 via-ink to-slate-950 text-white shadow-xl border border-teal-500/20">
              <h2 className="text-xl font-black text-glow font-display">Live OPD Delay & Arrival Radar</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
                When a visiting specialist from Srinagar is travelling, delayed in surgery, or arrives at the clinic,
                update their status here. The website homepage immediately displays a live alert badge, and you can copy a 1-tap WhatsApp broadcast.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {allDoctors.map((doc) => {
                const live = doctorStatuses[doc.id] ?? getDoctorLiveStatus(doc.id);
                const broadcastMsg = doctorDelayBroadcastText(doc.name ?? doc.speciality, live, dateLabel(selectedDate));

                return (
                  <div key={doc.id} className="card rounded-3xl p-5 sm:p-6 border border-line flex flex-col justify-between gap-4 bg-white shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                        <div>
                          <h3 className="text-lg font-black text-ink font-display">{doc.name ?? doc.speciality}</h3>
                          <p className="text-xs text-brand font-bold">{doc.speciality} · {doc.degree}</p>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                            live.state === "in_clinic"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : live.state === "delayed"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : live.state === "cancelled"
                              ? "bg-rose-100 text-rose-800 border border-rose-300"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
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
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Live Doctor Status</label>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "scheduled")}
                            className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                              live.state === "scheduled" ? "bg-slate-900 text-white shadow-sm" : "border-line bg-white hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            Scheduled
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "in_clinic")}
                            className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                              live.state === "in_clinic" ? "bg-emerald-600 text-white shadow-sm" : "border-line bg-white hover:bg-emerald-50 text-emerald-800"
                            }`}
                          >
                            🟢 In Clinic
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "delayed", live.delayMinutes || 30)}
                            className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                              live.state === "delayed" ? "bg-amber-500 text-white shadow-sm" : "border-line bg-white hover:bg-amber-50 text-amber-800"
                            }`}
                          >
                            🟡 Delayed
                          </button>

                          <button
                            type="button"
                            onClick={() => updateDoctorRadar(doc.id, "cancelled")}
                            className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                              live.state === "cancelled" ? "bg-rose-600 text-white shadow-sm" : "border-line bg-white hover:bg-rose-50 text-rose-800"
                            }`}
                          >
                            🔴 Cancelled
                          </button>
                        </div>
                      </div>

                      {/* Delay Configuration */}
                      {live.state === "delayed" && (
                        <div className="flex flex-col gap-2.5 rounded-2xl bg-amber-50/80 p-4 border border-amber-200 mt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900">Estimated Delay:</span>
                            <div className="flex gap-1">
                              {[15, 30, 45, 60, 90].map((min) => (
                                <button
                                  key={min}
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "delayed", min)}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                                    (live.delayMinutes ?? 30) === min
                                      ? "bg-amber-600 text-white"
                                      : "bg-white text-amber-800 border border-amber-300 hover:bg-amber-100"
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
                            className="min-h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {/* Broadcast WhatsApp Preview & Copy */}
                    {broadcastMsg && (
                      <div className="flex flex-col gap-2 border-t border-line/80 pt-3 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">WhatsApp Broadcast Notice:</span>
                          <button
                            type="button"
                            onClick={() => copyBroadcast(broadcastMsg)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                          >
                            📋 Copy Message
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] text-slate-700 border border-slate-200 font-sans leading-relaxed">
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
            <div className="flex flex-wrap items-center justify-between gap-4 card rounded-3xl p-5 border border-line shadow-xs">
              <div>
                <h2 className="text-xl font-bold text-ink font-display">OPD Days & Timings Management</h2>
                <p className="text-xs text-muted mt-0.5">
                  Update doctor sitting days, mark doctors on leave, or register a new visiting specialist.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark shadow-md shadow-brand/20 transition-all"
              >
                ➕ Register New Specialist
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {allDoctors.map((doc) => {
                const isOnLeave = doc.availability?.toLowerCase().includes("leave");

                return (
                  <div key={doc.id} className="card rounded-3xl p-5 border border-line flex flex-col justify-between gap-4 shadow-xs">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-black text-ink font-display">{doc.name ?? doc.speciality}</h3>
                          <p className="text-xs text-brand font-bold">{doc.speciality} · {doc.degree}</p>
                        </div>

                        {isOnLeave ? (
                          <span className="rounded-lg bg-rose-100 text-rose-800 text-xs px-2.5 py-0.5 font-bold border border-rose-200">
                            On Leave
                          </span>
                        ) : (
                          <span className="rounded-lg bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 font-bold border border-emerald-200">
                            Active OPD
                          </span>
                        )}
                      </div>

                      {/* OPD Sessions */}
                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-700">
                        <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Sitting Schedule:</span>
                        {doc.opd.length > 0 ? (
                          doc.opd.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center rounded-xl bg-slate-50 px-3 py-1.5 border border-slate-100">
                              <span className="font-bold text-slate-800">{DAY_NAMES[s.day]}</span>
                              <span className="font-semibold text-slate-600">{formatTime(s.start)} – {formatTime(s.end)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-slate-400 italic">No scheduled weekly OPD. By appointment.</p>
                        )}
                      </div>
                    </div>

                    {/* Toggle Leave */}
                    <div className="border-t border-line pt-3 flex justify-between items-center">
                      <button
                        type="button"
                        onClick={() => {
                          const newLeave = !isOnLeave;
                          setDoctorOverride(doc.id, { onLeave: newLeave });
                        }}
                        className={`min-h-10 px-3.5 rounded-xl text-xs font-bold transition-all ${
                          isOnLeave
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        {isOnLeave ? "Mark Available (End Leave)" : "Mark On Leave"}
                      </button>

                      <Link
                        href={`/book?doctor=${doc.id}`}
                        target="_blank"
                        className="text-xs text-brand font-bold hover:underline"
                      >
                        Preview Form →
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
            <div className="card rounded-3xl p-6 border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-950 via-slate-900 to-ink text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  <WhatsAppIcon className="size-3.5" /> 1-Tap WhatsApp to Owner
                </span>
                <h3 className="text-xl font-black font-display text-white">Daily OPD Summary for Clinic Owner</h3>
                <p className="text-xs text-slate-300 max-w-xl">
                  Send today&apos;s total patient counts, completed visits, and doctor breakdowns directly to the owner&apos;s WhatsApp with one tap at closing time.
                </p>
              </div>

              <a
                href={ownerWaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 text-sm font-black text-white hover:bg-[#20ba59] shadow-lg shadow-emerald-500/30 transition-all shrink-0 active:scale-95"
              >
                <WhatsAppIcon className="size-5" />
                <span>Send Day&apos;s Report to Owner</span>
              </a>
            </div>

            {/* Quick Actions Grid: Excel & JSON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full JSON Backup */}
              <div className="card rounded-3xl p-5 border border-line shadow-xs flex flex-col justify-between gap-4 bg-white">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">💾</span>
                    <h4 className="text-base font-black text-ink font-display">Full Clinic JSON Database Backup</h4>
                  </div>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    Downloads an encrypted complete backup file of all appointments, walk-ins, doctor schedule overrides, and custom specialists.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={downloadFullJsonBackup}
                    className="flex-1 min-h-11 rounded-xl bg-ink text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
                  >
                    📥 Download Backup File (.json)
                  </button>

                  <button
                    type="button"
                    onClick={() => restoreFileInputRef.current?.click()}
                    className="min-h-11 px-4 rounded-xl border border-line bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-all"
                  >
                    🔄 Restore Backup
                  </button>
                </div>
              </div>

              {/* Cross-Device Cloud Sync */}
              <div className="card rounded-3xl p-5 border border-line shadow-xs flex flex-col justify-between gap-4 bg-white">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🛰️</span>
                    <h4 className="text-base font-black text-ink font-display">Cross-Device Live Sync Status</h4>
                  </div>
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    Synchronizes real-time appointments across all clinic tablets, receptionist phones, and patient booking channels.
                  </p>
                  <p className="text-xs font-bold text-brand mt-1">
                    Last Synced: {lastSyncDisplay}
                  </p>
                </div>

                <div className="pt-2 border-t border-line">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    className="w-full min-h-11 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all shadow-xs"
                  >
                    🔄 Force Cloud Sync Now
                  </button>
                </div>
              </div>
            </div>

            {/* Daily Archive Table */}
            <div className="card rounded-3xl p-5 border border-line shadow-xs flex flex-col gap-4 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <h4 className="text-base font-black text-ink font-display">Historical OPD Records by Date</h4>
                  <p className="text-xs text-muted">Download past days into individual Excel / CSV sheets.</p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadCsv()}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
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
                            <span className="font-bold text-sm text-ink">{dateLabel(dateKey)}</span>
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
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
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
            <div className="card rounded-3xl p-5 border border-line shadow-xs flex flex-col gap-3">
              <label htmlFor="search-input" className="text-lg font-bold text-ink font-display">
                Find Patient Record by Name, Village/Area, Phone, or Token
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-line px-4 bg-slate-50 focus-within:border-brand focus-within:bg-white transition-all">
                <SearchIcon className="size-5 text-slate-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="e.g. Ghulam Mohammad, Tarzoo, Dangerpora, 97977... or EP-AK..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-13 bg-transparent text-base outline-none font-medium"
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
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{a.token}</span>
                          <span className="font-black text-ink text-base">{a.patientName}</span>
                          {a.patientAddress && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-teal-50 border border-teal-200 text-teal-800 px-2 py-0.5 text-xs font-bold">
                              📍 {a.patientAddress}
                            </span>
                          )}
                          <span className="text-xs text-muted font-mono">(+91 {a.patientPhone})</span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          {a.doctorName} ({a.speciality}) · {dateLabel(a.date)} at {formatTime(a.time)} · Status: <strong>{a.status}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:+91${a.patientPhone}`}
                          className="min-h-10 px-3.5 rounded-xl bg-brand text-white text-xs font-bold inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 flex flex-col gap-5 max-h-[90vh] overflow-y-auto bg-white">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-black text-ink font-display">Register Walk-in Patient</h3>
                <p className="text-xs text-muted">Locks the slot instantly to prevent double-booking.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="size-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {walkInError && (
              <p className="rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-800 border border-rose-200">
                {walkInError}
              </p>
            )}

            <div className="flex flex-col gap-4">
              {/* Doctor */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-doc" className="text-xs font-bold uppercase tracking-wider text-slate-500">Consultant Specialist</label>
                <select
                  id="walkin-doc"
                  value={walkInDocId}
                  onChange={(e) => {
                    setWalkInDocId(e.target.value);
                    setWalkInTime("");
                  }}
                  className="min-h-12 rounded-xl border border-line px-3 text-sm sm:text-base font-bold bg-slate-50"
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
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Available Slot ({dateLabel(selectedDate)})
                  </label>
                  {(() => {
                    const doc = allDoctors.find((d) => d.id === walkInDocId);
                    if (!doc) return null;
                    const slots = timeSlots(doc, selectedDate, now);
                    const taken = getBookedSlots(doc.id, selectedDate);

                    return (
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 border border-line rounded-xl bg-slate-50">
                        {slots.map((s) => {
                          const isOccupied = taken.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setWalkInTime(s)}
                              className={`min-h-10 rounded-lg text-xs font-bold border transition-all ${
                                isOccupied
                                  ? "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                                  : walkInTime === s
                                  ? "bg-brand text-white border-brand shadow-xs"
                                  : "bg-white text-slate-800 border-line hover:border-slate-400"
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
                <label htmlFor="walkin-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Patient Full Name</label>
                <input
                  id="walkin-name"
                  type="text"
                  placeholder="e.g. Ghulam Mohammad"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="min-h-12 rounded-xl border border-line px-4 text-base font-semibold"
                />
              </div>

              {/* Patient Village / Address (Crucial for disambiguating identical names) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label htmlFor="walkin-address" className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Village / Town / Address
                  </label>
                  <span className="text-[11px] text-brand font-bold">Prevents same-name confusion</span>
                </div>
                <input
                  id="walkin-address"
                  type="text"
                  placeholder="e.g. Tarzoo, Dangerpora, Sangrama, Sopore"
                  value={walkInAddress}
                  onChange={(e) => setWalkInAddress(e.target.value)}
                  className="min-h-12 rounded-xl border border-line px-4 text-base font-semibold focus:border-brand"
                />
              </div>

              {/* Patient Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-phone" className="text-xs font-bold uppercase tracking-wider text-slate-500">Mobile Number (10 Digits)</label>
                <div className="flex rounded-xl border border-line overflow-hidden">
                  <span className="bg-slate-100 px-3.5 py-3 text-sm font-bold text-slate-600 border-r border-line">+91</span>
                  <input
                    id="walkin-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit number"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="flex-1 px-4 min-h-12 text-base font-semibold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="flex-1 min-h-12 rounded-2xl border border-line text-slate-700 font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWalkIn}
                className="flex-1 min-h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black hover:brightness-110 shadow-lg shadow-emerald-600/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-emerald-500 flex flex-col gap-4 text-center bg-white">
            <span className="text-4xl">🎟️</span>
            <div>
              <span className="text-xs font-bold uppercase text-emerald-700">Official Token Slip Issued</span>
              <h3 className="text-3xl font-black font-mono tracking-wider text-ink mt-1 font-display">
                {walkInSuccessSlip.token}
              </h3>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-left text-xs space-y-1.5 border border-line">
              <p><strong>Patient:</strong> {walkInSuccessSlip.patientName}</p>
              {walkInSuccessSlip.patientAddress && (
                <p className="text-teal-800 font-bold"><strong>Village / Area:</strong> 📍 {walkInSuccessSlip.patientAddress}</p>
              )}
              <p><strong>Doctor:</strong> {walkInSuccessSlip.doctorName}</p>
              <p><strong>Slot:</strong> {formatTime(walkInSuccessSlip.time)}</p>
              <p><strong>Date:</strong> {dateLabel(walkInSuccessSlip.date)}</p>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-12 rounded-2xl bg-ink text-white font-bold text-xs hover:bg-slate-800"
              >
                🖨️ Print Slip
              </button>
              <button
                type="button"
                onClick={() => setWalkInSuccessSlip(null)}
                className="flex-1 min-h-12 rounded-2xl border border-line text-slate-800 font-bold text-xs hover:bg-slate-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-4 bg-white">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-bold text-ink font-display">Add Visiting Specialist</h3>
                <p className="text-xs text-muted">Register doctor details and sitting schedule.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="size-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label htmlFor="new-doc-name" className="text-xs font-bold uppercase text-slate-500">Doctor Full Name</label>
                <input
                  id="new-doc-name"
                  type="text"
                  placeholder="e.g. Dr. Shabir Ahmad"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
                />
              </div>

              <div>
                <label htmlFor="new-doc-spec" className="text-xs font-bold uppercase text-slate-500">Speciality</label>
                <input
                  id="new-doc-spec"
                  type="text"
                  placeholder="e.g. Orthopedics & Joint Replacement"
                  value={newDocSpec}
                  onChange={(e) => setNewDocSpec(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
                />
              </div>

              <div>
                <label htmlFor="new-doc-degree" className="text-xs font-bold uppercase text-slate-500">Degree & Credentials</label>
                <input
                  id="new-doc-degree"
                  type="text"
                  placeholder="e.g. MBBS, MS Ortho, Former SKIMS"
                  value={newDocDegree}
                  onChange={(e) => setNewDocDegree(e.target.value)}
                  className="w-full min-h-11 rounded-xl border border-line px-3 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="new-doc-day" className="text-xs font-bold uppercase text-slate-500">OPD Day</label>
                  <select
                    id="new-doc-day"
                    value={newDocDay}
                    onChange={(e) => setNewDocDay(Number(e.target.value))}
                    className="w-full min-h-11 rounded-xl border border-line px-2 text-xs font-semibold"
                  >
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="new-doc-start" className="text-xs font-bold uppercase text-slate-500">Start Time</label>
                  <input
                    id="new-doc-start"
                    type="time"
                    value={newDocStart}
                    onChange={(e) => setNewDocStart(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-line px-2 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="new-doc-end" className="text-xs font-bold uppercase text-slate-500">End Time</label>
                  <input
                    id="new-doc-end"
                    type="time"
                    value={newDocEnd}
                    onChange={(e) => setNewDocEnd(e.target.value)}
                    className="w-full min-h-11 rounded-xl border border-line px-2 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="flex-1 min-h-11 rounded-2xl border border-line text-slate-700 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewDoctor}
                className="flex-1 min-h-11 rounded-2xl bg-brand text-white font-bold text-sm hover:bg-brand-dark"
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
