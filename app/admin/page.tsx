"use client";

// Tablet & Reception Management Portal for Eternal Polyclinic, Sopore.
// Real-time OPD registration, walk-in entry, double-booking prevention,
// doctor live delay radar, and schedule adjustments.
// Designed specifically for reception desk tablets and clinic staff.

import { useEffect, useState } from "react";
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
  getBookedSlots,
  getDoctorLiveStatus,
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
  ShieldCheckIcon,
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
  const [activeTab, setActiveTab] = useState<"opd" | "radar" | "doctors" | "search">("opd");

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
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [walkInError, setWalkInError] = useState<string>("");
  const [walkInSuccessSlip, setWalkInSuccessSlip] = useState<Appointment | null>(null);

  // Broadcast copy toast
  const [broadcastToast, setBroadcastToast] = useState<string>("");

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // New Doctor Modal
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState<string>("");
  const [newDocSpec, setNewDocSpec] = useState<string>("");
  const [newDocDegree, setNewDocDegree] = useState<string>("");
  const [newDocDay, setNewDocDay] = useState<number>(6); // Saturday
  const [newDocStart, setNewDocStart] = useState<string>("10:00");
  const [newDocEnd, setNewDocEnd] = useState<string>("14:00");

  function handleLogin(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const storedPin = localStorage.getItem("ep_admin_pin") || DEFAULT_PIN;
    if (pinInput === storedPin || pinInput === DEFAULT_PIN) {
      sessionStorage.setItem("ep_reception_auth", "true");
      setIsAuthenticated(true);
      setPinError("");
    } else {
      setPinError("Incorrect PIN. Default PIN is 1234.");
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

    // Generate walk in token
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
      type: "walk_in",
      status: "arrived",
      createdAt: Date.now(),
    };

    saveAppointment(walkInApt);
    setWalkInSuccessSlip(walkInApt);
    setWalkInName("");
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
    setBroadcastToast("Broadcast copied to clipboard! Paste directly into WhatsApp groups.");
    setTimeout(() => setBroadcastToast(""), 4000);
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

  // ---------------------------------------------------------------------------
  // PIN Login Gate Screen
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-12">
        <div className="card w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-xl border border-line flex flex-col gap-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-tint text-brand">
            <ShieldCheckIcon className="size-8 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-ink">Reception Desk Portal</h1>
            <p className="text-sm text-muted mt-1">Eternal Polyclinic, Sopore · Staff & Tablet Access</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4 text-left">
            <div>
              <label htmlFor="pin-input" className="block text-sm font-bold text-slate-700 mb-1">
                Enter Reception 4-digit PIN
              </label>
              <input
                id="pin-input"
                type="password"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                placeholder="Default: 1234"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-widest text-2xl font-mono min-h-13 rounded-xl border border-line px-4 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 bg-slate-50"
              />
            </div>

            {pinError && <p className="text-sm font-semibold text-emergency text-center">{pinError}</p>}

            <button
              type="submit"
              className="w-full min-h-13 rounded-2xl bg-brand text-white font-bold text-lg hover:bg-brand-dark shadow-md transition-all mt-2"
            >
              Sign In to Reception Desk
            </button>
          </form>

          <p className="text-xs text-muted">
            For reception tablet or clinic management use only. Default PIN is <span className="font-mono font-bold">1234</span>.
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main Tablet Reception Workspace
  // ---------------------------------------------------------------------------
  return (
    <div className="min-w-0 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
      {/* Printable OPD Register Sheet (Visible only when printing) */}
      <div className="hidden print:block print-only">
        <div className="border-b-2 border-black pb-4 mb-4">
          <h1 className="text-2xl font-bold text-black uppercase">{clinic.name} — OPD Patient Register</h1>
          <p className="text-sm text-gray-700">{clinic.address} · Helpline: 97977 96909</p>
          <div className="mt-2 flex justify-between text-sm font-bold">
            <span>Date: {dateLabel(selectedDate)}</span>
            <span>Doctor: {doctorFilter === "all" ? "All Specialists" : allDoctors.find((d) => d.id === doctorFilter)?.name}</span>
            <span>Total Patients: {filteredAppointments.length}</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse border border-gray-400 text-sm">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-400">
              <th className="border border-gray-400 p-2">Token #</th>
              <th className="border border-gray-400 p-2">Time</th>
              <th className="border border-gray-400 p-2">Patient Name</th>
              <th className="border border-gray-400 p-2">Mobile</th>
              <th className="border border-gray-400 p-2">Type</th>
              <th className="border border-gray-400 p-2">Status</th>
              <th className="border border-gray-400 p-2 w-48">Doctor&apos;s Notes / Rx</th>
            </tr>
          </thead>
          <tbody>
            {filteredAppointments.map((apt) => (
              <tr key={apt.token} className="border-b border-gray-300">
                <td className="border border-gray-400 p-2 font-mono font-bold">{apt.token}</td>
                <td className="border border-gray-400 p-2 font-bold">{formatTime(apt.time)}</td>
                <td className="border border-gray-400 p-2 font-semibold">{apt.patientName}</td>
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
        {/* Top Header Bar with Live Clock and Action */}
        <header className="flex flex-wrap items-center justify-between gap-4 card rounded-2xl p-4 sm:px-6 border border-line/90 shadow-sm bg-white">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold">
              <StethoscopeIcon className="size-6 text-brand" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                  Reception Tablet Suite
                </h1>
                <span className="hidden sm:inline-flex rounded-full bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 font-bold">
                  ● Live Sync
                </span>
              </div>
              <p className="text-xs text-muted">
                {clinic.name} · {clinic.address}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock */}
            <div className="hidden sm:flex flex-col text-right font-mono">
              <span className="text-xs text-muted uppercase font-sans font-semibold">Clinic Time</span>
              <span className="text-base font-bold text-ink">{fromMinutes(clock.minutes)} IST</span>
            </div>

            {/* Quick 1-Tap Walk-In Button */}
            <button
              type="button"
              onClick={() => {
                setShowWalkInModal(true);
                setWalkInDocId(doctorFilter !== "all" ? doctorFilter : allDoctors[0]?.id || "");
              }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm sm:text-base font-bold text-white hover:bg-emerald-700 shadow-md transition-all active:scale-95"
            >
              ➕ Add Walk-In
            </button>

            {/* Logout */}
            <button
              type="button"
              onClick={handleLogout}
              title="Lock Tablet"
              className="min-h-12 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              🔒 Lock
            </button>
          </div>
        </header>

        {/* Broadcast Toast Notification */}
        {broadcastToast && (
          <div className="rounded-xl bg-emerald-500 text-white font-bold text-sm px-4 py-3 shadow-md flex items-center justify-between animate-fade-in">
            <span>{broadcastToast}</span>
            <button type="button" onClick={() => setBroadcastToast("")} className="text-white hover:underline">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation Navigation Bar */}
        <nav className="flex gap-2 border-b border-line pb-2 overflow-x-auto text-sm sm:text-base font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("opd")}
            className={`min-h-12 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "opd" ? "bg-ink text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
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
            className={`min-h-12 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "radar" ? "bg-ink text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            🛰️ Doctor Delay Radar
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("doctors")}
            className={`min-h-12 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "doctors" ? "bg-ink text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            🩺 Doctor Timings & Leaves
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`min-h-12 px-4 py-2 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "search" ? "bg-ink text-white shadow-sm" : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            🔍 Patient Search
          </button>
        </nav>

        {/* ===================================================================== */}
        {/* TAB 1: OPD PATIENT REGISTER                                          */}
        {/* ===================================================================== */}
        {activeTab === "opd" && (
          <div className="flex flex-col gap-6">
            {/* Filters & Date Bar */}
            <div className="card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 border border-line">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label htmlFor="date-select" className="text-xs font-bold uppercase text-slate-500 mb-1">
                    Select Date
                  </label>
                  <input
                    id="date-select"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm sm:text-base font-semibold bg-slate-50"
                  />
                </div>

                <div className="flex gap-1.5 self-end pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(todayKey)}
                    className={`min-h-10 px-3 rounded-lg text-xs font-bold ${
                      selectedDate === todayKey ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Today
                  </button>
                </div>

                <div className="flex flex-col min-w-44">
                  <label htmlFor="doc-select" className="text-xs font-bold uppercase text-slate-500 mb-1">
                    Doctor Filter
                  </label>
                  <select
                    id="doc-select"
                    value={doctorFilter}
                    onChange={(e) => setDoctorFilter(e.target.value)}
                    className="min-h-11 rounded-xl border border-line px-3 py-1 text-sm sm:text-base font-semibold bg-slate-50"
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

              <div className="flex items-center gap-2 self-end">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-bold text-slate-800 hover:bg-slate-100 shadow-sm"
                >
                  🖨️ Print OPD Sheet
                </button>
              </div>
            </div>

            {/* Stat Counters */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <div className="card rounded-2xl p-4 border border-line/80 bg-white shadow-xs">
                <span className="text-xs font-bold uppercase text-slate-500">Total Booked</span>
                <p className="text-2xl font-black text-ink mt-1">{filteredAppointments.length}</p>
                <span className="text-xs text-muted">
                  {filteredAppointments.filter((a) => a.type === "online").length} Online ·{" "}
                  {filteredAppointments.filter((a) => a.type === "walk_in").length} Walk-in
                  {countCancelled > 0 ? ` · ${countCancelled} Cancelled` : ""}
                </span>
              </div>

              <div className="card rounded-2xl p-4 border border-amber-200 bg-amber-50/50 shadow-xs">
                <span className="text-xs font-bold uppercase text-amber-800">Waiting in Clinic</span>
                <p className="text-2xl font-black text-amber-900 mt-1">{countWaiting}</p>
                <span className="text-xs text-amber-700">Ready for doctor</span>
              </div>

              <div className="card rounded-2xl p-4 border border-blue-200 bg-blue-50/50 shadow-xs">
                <span className="text-xs font-bold uppercase text-blue-800">In Consultation</span>
                <p className="text-2xl font-black text-blue-900 mt-1">{countInConsult}</p>
                <span className="text-xs text-blue-700">Inside cabin</span>
              </div>

              <div className="card rounded-2xl p-4 border border-emerald-200 bg-emerald-50/50 shadow-xs">
                <span className="text-xs font-bold uppercase text-emerald-800">Completed</span>
                <p className="text-2xl font-black text-emerald-900 mt-1">{countCompleted}</p>
                <span className="text-xs text-emerald-700">Finished visit</span>
              </div>
            </div>

            {/* Patient Queue List */}
            {filteredAppointments.length === 0 ? (
              <div className="card rounded-3xl p-12 text-center border border-dashed border-slate-300">
                <p className="text-lg font-bold text-slate-700">No appointments scheduled for this date & doctor.</p>
                <p className="text-sm text-muted mt-1">Tap &quot;➕ Add Walk-In&quot; to register a patient arriving at reception.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredAppointments.map((apt) => {
                  const statusColors: Record<AppointmentStatus, string> = {
                    confirmed: "bg-amber-100 text-amber-800 border-amber-300",
                    arrived: "bg-blue-100 text-blue-800 border-blue-300",
                    in_consultation: "bg-purple-100 text-purple-800 border-purple-300",
                    completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
                    cancelled: "bg-rose-100 text-rose-800 border-rose-300",
                  };

                  const callMsg = `Hello ${apt.patientName}, your token #${apt.token} for ${apt.doctorName} at Eternal Polyclinic is next. Please report to the consultation room.`;
                  const callWaUrl = `https://wa.me/91${apt.patientPhone}?text=${encodeURIComponent(callMsg)}`;

                  return (
                    <div
                      key={apt.token}
                      className={`card rounded-2xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        apt.status === "in_consultation"
                          ? "border-purple-400 bg-purple-50/20 ring-2 ring-purple-300"
                          : "border-line bg-white"
                      }`}
                    >
                      {/* Left: Token, Time, Details */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center justify-center rounded-xl bg-slate-900 text-glow px-3 py-2 font-mono font-bold shrink-0 min-w-28 text-center shadow-xs">
                          <span className="text-xs uppercase text-slate-400">Token</span>
                          <span className="text-base sm:text-lg font-black tracking-wider">{apt.token}</span>
                          <span className="text-[11px] text-slate-300 mt-0.5">{formatTime(apt.time)}</span>
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black text-ink">{apt.patientName}</span>
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase border ${
                                apt.type === "walk_in"
                                  ? "bg-teal-50 text-teal-800 border-teal-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }`}
                            >
                              {apt.type === "walk_in" ? "Walk-in" : "Online"}
                            </span>
                          </div>

                          <div className="text-xs text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>🩺 {apt.doctorName}</span>
                            <span>·</span>
                            <span>📱 +91 {apt.patientPhone}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Flow & Actions */}
                      <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
                        {/* Status Selector */}
                        <select
                          value={apt.status}
                          onChange={(e) => updateAppointmentStatus(apt.token, e.target.value as AppointmentStatus)}
                          className={`min-h-11 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-bold border ${statusColors[apt.status]}`}
                        >
                          <option value="confirmed">⏳ Confirmed (Waiting)</option>
                          <option value="arrived">🚶 In Waiting Room</option>
                          <option value="in_consultation">🩺 With Doctor</option>
                          <option value="completed">✅ Consultation Done</option>
                          <option value="cancelled">❌ Cancelled / No Show</option>
                        </select>

                        {/* Quick WhatsApp Alert to Patient */}
                        <a
                          href={callWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Message Patient"
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#20ba59]"
                        >
                          <WhatsAppIcon className="size-4" /> Alert Patient
                        </a>

                        {/* Call Patient */}
                        <a
                          href={`tel:+91${apt.patientPhone}`}
                          title="Call Patient"
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
                          title="Delete Token"
                          className="min-h-11 rounded-xl px-2 py-1.5 text-xs text-slate-400 hover:text-emergency"
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
          <div className="flex flex-col gap-6">
            <div className="card rounded-2xl p-5 border border-line bg-gradient-to-r from-teal-900 to-ink text-white">
              <h2 className="text-xl font-black text-glow">Live OPD Delay & Arrival Radar</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                When a visiting specialist from Srinagar is stuck on the highway, delayed in surgery, or arrives at the clinic,
                update their status here. The website will immediately update its delay badge, and you can copy a 1-tap WhatsApp broadcast.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {allDoctors.map((doc) => {
                const live = doctorStatuses[doc.id] ?? getDoctorLiveStatus(doc.id);
                const broadcastMsg = doctorDelayBroadcastText(doc.name ?? doc.speciality, live, dateLabel(selectedDate));

                return (
                  <div key={doc.id} className="card rounded-3xl p-5 sm:p-6 border border-line flex flex-col gap-4 bg-white shadow-xs">
                    <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink">{doc.name ?? doc.speciality}</h3>
                        <p className="text-xs text-brand font-semibold">{doc.speciality} · {doc.degree}</p>
                      </div>

                      {/* Current Status Pill */}
                      <span
                        className={`rounded-xl px-3 py-1 text-xs font-bold uppercase ${
                          live.state === "in_clinic"
                            ? "bg-emerald-100 text-emerald-800"
                            : live.state === "delayed"
                            ? "bg-amber-100 text-amber-800"
                            : live.state === "cancelled"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {live.state === "in_clinic"
                          ? "● In Clinic"
                          : live.state === "delayed"
                          ? `⚠️ Delayed (~${live.delayMinutes ?? 30}m)`
                          : live.state === "cancelled"
                          ? "🔴 Cancelled Today"
                          : "Scheduled (On Time)"}
                      </span>
                    </div>

                    {/* Status Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold uppercase text-slate-500">Update Doctor OPD State</label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => updateDoctorRadar(doc.id, "scheduled")}
                          className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                            live.state === "scheduled" ? "bg-slate-800 text-white" : "border-line bg-white hover:bg-slate-50"
                          }`}
                        >
                          Scheduled
                        </button>

                        <button
                          type="button"
                          onClick={() => updateDoctorRadar(doc.id, "in_clinic")}
                          className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                            live.state === "in_clinic" ? "bg-emerald-600 text-white" : "border-line bg-white hover:bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          🟢 In Clinic
                        </button>

                        <button
                          type="button"
                          onClick={() => updateDoctorRadar(doc.id, "delayed", live.delayMinutes || 30)}
                          className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                            live.state === "delayed" ? "bg-amber-500 text-white" : "border-line bg-white hover:bg-amber-50 text-amber-800"
                          }`}
                        >
                          🟡 Delayed
                        </button>

                        <button
                          type="button"
                          onClick={() => updateDoctorRadar(doc.id, "cancelled")}
                          className={`min-h-11 rounded-xl text-xs font-bold border transition-all ${
                            live.state === "cancelled" ? "bg-rose-600 text-white" : "border-line bg-white hover:bg-rose-50 text-rose-800"
                          }`}
                        >
                          🔴 Cancelled
                        </button>
                      </div>
                    </div>

                    {/* If delayed: select minutes and note */}
                    {live.state === "delayed" && (
                      <div className="flex flex-col gap-2.5 rounded-2xl bg-amber-50/70 p-4 border border-amber-200">
                        <div className="flex items-center justify-between">
                          <label htmlFor={`delay-select-${doc.id}`} className="text-xs font-bold text-amber-900">Estimated Delay Duration</label>
                          <select
                            id={`delay-select-${doc.id}`}
                            value={live.delayMinutes ?? 30}
                            onChange={(e) => updateDoctorRadar(doc.id, "delayed", Number(e.target.value))}
                            className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-xs font-bold"
                          >
                            <option value={15}>15 Minutes</option>
                            <option value={30}>30 Minutes</option>
                            <option value={45}>45 Minutes</option>
                            <option value={60}>1 Hour</option>
                            <option value={90}>1.5 Hours</option>
                            <option value={120}>2 Hours</option>
                          </select>
                        </div>

                        <input
                          type="text"
                          placeholder="Reason (e.g. Highway traffic / SKIMS Emergency)"
                          value={live.note ?? ""}
                          onChange={(e) => updateDoctorRadar(doc.id, "delayed", live.delayMinutes, e.target.value)}
                          className="min-h-10 rounded-xl border border-amber-300 bg-white px-3 text-xs sm:text-sm"
                        />
                      </div>
                    )}

                    {/* Broadcast WhatsApp Preview & Copy */}
                    {broadcastMsg && (
                      <div className="flex flex-col gap-2 mt-auto border-t border-line/80 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-500">WhatsApp Broadcast Notice:</span>
                          <button
                            type="button"
                            onClick={() => copyBroadcast(broadcastMsg)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                          >
                            📋 Copy Broadcast
                          </button>
                        </div>
                        <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[11px] sm:text-xs text-slate-700 border border-slate-200 font-sans">
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-4 card rounded-2xl p-4 sm:p-5 border border-line">
              <div>
                <h2 className="text-xl font-bold text-ink">OPD Days & Timings Management</h2>
                <p className="text-xs text-muted mt-0.5">
                  Update doctor sitting days, mark doctors on leave, or register a new visiting doctor.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewDocModal(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white hover:bg-brand-dark"
              >
                ➕ Register New Specialist
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {allDoctors.map((doc) => {
                const isOnLeave = doc.availability?.toLowerCase().includes("leave");

                return (
                  <div key={doc.id} className="card rounded-2xl p-5 border border-line flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-lg font-bold text-ink">{doc.name ?? doc.speciality}</h3>
                          <p className="text-xs text-brand font-semibold">{doc.speciality} · {doc.degree}</p>
                        </div>

                        {isOnLeave ? (
                          <span className="rounded-md bg-rose-100 text-rose-800 text-xs px-2 py-0.5 font-bold">
                            On Leave
                          </span>
                        ) : (
                          <span className="rounded-md bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 font-bold">
                            Active OPD
                          </span>
                        )}
                      </div>

                      {/* OPD Sessions */}
                      <div className="mt-3 flex flex-col gap-1.5 text-xs text-slate-700">
                        <span className="font-semibold text-slate-500 uppercase text-[10px]">Sitting Days:</span>
                        {doc.opd.length > 0 ? (
                          doc.opd.map((s, idx) => (
                            <div key={idx} className="flex justify-between items-center rounded-lg bg-slate-50 px-2.5 py-1">
                              <span className="font-bold">{DAY_NAMES[s.day]}</span>
                              <span>{formatTime(s.start)} – {formatTime(s.end)}</span>
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
                        className={`min-h-10 px-3 rounded-lg text-xs font-bold transition-all ${
                          isOnLeave
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                        }`}
                      >
                        {isOnLeave ? "Mark Available (End Leave)" : "Mark On Leave"}
                      </button>

                      <Link
                        href={`/book?doctor=${doc.id}`}
                        target="_blank"
                        className="text-xs text-brand font-semibold hover:underline"
                      >
                        Preview Booking Form →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================== */}
        {/* TAB 4: PATIENT SEARCH                                                */}
        {/* ===================================================================== */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-6">
            <div className="card rounded-2xl p-5 border border-line flex flex-col gap-4">
              <label htmlFor="search-input" className="text-lg font-bold text-ink">Find Patient Appointment</label>
              <div className="flex items-center gap-2 rounded-xl border border-line px-3 bg-slate-50 focus-within:border-brand">
                <SearchIcon className="size-5 text-slate-400" />
                <input
                  id="search-input"
                  type="text"
                  placeholder="Search by Patient Name, 10-digit Mobile, or Token # (e.g. EP-AK...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-12 bg-transparent text-base outline-none font-medium"
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
                      a.patientPhone.includes(q) ||
                      a.token.toLowerCase().includes(q)
                    );
                  })
                  .map((a) => (
                    <div key={a.token} className="card rounded-2xl p-4 border border-line flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-ink">{a.token}</span>
                          <span className="font-bold text-ink">{a.patientName}</span>
                          <span className="text-xs text-muted">(+91 {a.patientPhone})</span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {a.doctorName} · {dateLabel(a.date)} at {formatTime(a.time)} · Status: <strong>{a.status}</strong>
                        </p>
                      </div>

                      <a
                        href={`tel:+91${a.patientPhone}`}
                        className="min-h-10 px-3 rounded-lg bg-brand text-white text-xs font-bold inline-flex items-center gap-1"
                      >
                        <PhoneIcon className="size-3.5" /> Call
                      </a>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================================= */}
      {/* 1-TAP WALK-IN PATIENT ENTRY MODAL                                      */}
      {/* ======================================================================= */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-black text-ink">Register Walk-in Patient</h3>
                <p className="text-xs text-muted">Instantly locks the slot and generates an official token.</p>
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
                <label htmlFor="walkin-doc" className="text-xs font-bold uppercase text-slate-500">Consultant Specialist</label>
                <select
                  id="walkin-doc"
                  value={walkInDocId}
                  onChange={(e) => {
                    setWalkInDocId(e.target.value);
                    setWalkInTime("");
                  }}
                  className="min-h-12 rounded-xl border border-line px-3 text-base font-semibold bg-slate-50"
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
                  <label className="text-xs font-bold uppercase text-slate-500">
                    Select Available Slot on {dateLabel(selectedDate)}
                  </label>
                  {(() => {
                    const doc = allDoctors.find((d) => d.id === walkInDocId);
                    if (!doc) return null;
                    const slots = timeSlots(doc, selectedDate, now);
                    const taken = getBookedSlots(doc.id, selectedDate);

                    return (
                      <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto p-1">
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
                                  ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed line-through"
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
                <label htmlFor="walkin-name" className="text-xs font-bold uppercase text-slate-500">Patient Full Name</label>
                <input
                  id="walkin-name"
                  type="text"
                  placeholder="e.g. Ghulam Nabi"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className="min-h-12 rounded-xl border border-line px-4 text-base font-medium"
                />
              </div>

              {/* Patient Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-phone" className="text-xs font-bold uppercase text-slate-500">Mobile Number (10 Digits)</label>
                <div className="flex rounded-xl border border-line overflow-hidden">
                  <span className="bg-slate-100 px-3 py-3 text-sm font-semibold text-slate-600 border-r border-line">+91</span>
                  <input
                    id="walkin-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit number"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="flex-1 px-4 min-h-12 text-base font-medium outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="flex-1 min-h-12 rounded-xl border border-line text-slate-700 font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWalkIn}
                className="flex-1 min-h-12 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md"
              >
                Confirm Walk-in Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* WALK-IN SUCCESS TOKEN SLIP POPUP                                       */}
      {/* ======================================================================= */}
      {walkInSuccessSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-md rounded-3xl p-6 shadow-2xl border-2 border-emerald-500 flex flex-col gap-4 text-center bg-white">
            <span className="text-4xl">🎟️</span>
            <div>
              <span className="text-xs font-bold uppercase text-emerald-700">Walk-in Token Issued</span>
              <h3 className="text-3xl font-black font-mono tracking-wider text-ink mt-1">
                {walkInSuccessSlip.token}
              </h3>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-left text-sm space-y-1.5 border border-line">
              <p><strong>Patient:</strong> {walkInSuccessSlip.patientName}</p>
              <p><strong>Doctor:</strong> {walkInSuccessSlip.doctorName}</p>
              <p><strong>Slot Time:</strong> {formatTime(walkInSuccessSlip.time)}</p>
              <p><strong>Date:</strong> {dateLabel(walkInSuccessSlip.date)}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 min-h-12 rounded-xl bg-ink text-white font-bold text-sm hover:bg-slate-800"
              >
                🖨️ Print Slip
              </button>
              <button
                type="button"
                onClick={() => setWalkInSuccessSlip(null)}
                className="flex-1 min-h-12 rounded-xl border border-line text-slate-800 font-bold text-sm hover:bg-slate-100"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="card w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-line flex flex-col gap-4">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-xl font-bold text-ink">Add Visiting Specialist</h3>
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
                className="flex-1 min-h-11 rounded-xl border border-line text-slate-700 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewDoctor}
                className="flex-1 min-h-11 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark"
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
