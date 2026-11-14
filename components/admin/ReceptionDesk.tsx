"use client";

// Clinic dashboard: Reception & Admin Desk (design v4, Minimalist Clinical / Healist):
// Real-time OPD registration, walk-in entry, double-booking prevention,
// doctor live delay radar, village/town disambiguation,
// local tab sync, end-of-day CSV/JSON backup, and 1-tap WhatsApp report to owner.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  checkCloudAdminSession,
  deleteAppointment,
  doctorDelayBroadcastText,
  downloadCsv,
  downloadFullJsonBackup,
  formatDailyOwnerSummary,
  generateToken,
  getBookedSlots,
  getDoctorLiveStatus,
  getLastSyncTime,
  loginAdminPortal,
  logoutAdminPortal,
  pullFromCloud,
  pushToCloud,
  removeCustomDoctor,
  restoreFromJsonBackup,
  saveAppointment,
  saveCustomDoctor,
  setDoctorLiveStatus,
  setDoctorOverride,
  updateAdminPortalPin,
  updateAppointmentStatus,
  useActiveDoctors,
  useAppointments,
  useCloudSyncStatus,
  useDoctorStatuses,
  type Appointment,
  type AppointmentStatus,
  type DoctorLiveState,
} from "@/lib/appointments";
import { DoctorMark } from "@/components/DoctorMark";
import { CounterQrPoster } from "@/components/CounterQrPoster";
import { DoctorScheduleEditor } from "@/components/admin/DoctorScheduleEditor";
import { PatientsPanel } from "@/components/admin/PatientsPanel";
import { LabReportsPanel } from "@/components/admin/LabReportsPanel";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { StatsPanel } from "@/components/admin/StatsPanel";
import { DatabaseMissingCard, OwnerSetupCard, StaffPanel } from "@/components/admin/StaffPanel";
import { WalkInPatientHint } from "@/components/admin/WalkInPatientHint";
import { ROLE_LABEL, api, type StaffSession } from "@/lib/staff-api";
import type { OwnerSummaryStats } from "@/lib/messages";
import {
  CalendarCheckIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  LockIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  RadarIcon,
  RefreshIcon,
  ReportIcon,
  SearchIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  UserIcon,
  WhatsAppIcon,
} from "@/components/Icons";

const emptySubscribe = () => () => {};

const fieldLabel = "text-xs font-bold uppercase tracking-[0.12em] text-muted";
const fieldInput =
  "min-h-12 w-full rounded-xl border border-line-strong bg-white px-3.5 text-base text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none transition-colors";

export type DeskTab =
  | "patients"
  | "opd"
  | "labs"
  | "doctors"
  | "radar"
  | "notify"
  | "stats"
  | "backups"
  | "search"
  | "staff";

/**
 * The reception/admin screen. With `staff` (a signed-in staff account) it shows the full role-aware
 * dashboard: Patients, Appointments, Lab Reports, Doctors, Availability, WhatsApp, Statistics, Owner Reports.
 * Without it (no staff accounts yet, or `next dev`), it is the original shared-PIN reception desk.
 */
export function ReceptionDesk({
  staff = null,
  setupMode = false,
  databaseMissing = false,
}: {
  staff?: StaffSession | null;
  setupMode?: boolean;
  databaseMissing?: boolean;
}) {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const cloudStatus = useCloudSyncStatus();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(staff));
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [isSubmittingPin, setIsSubmittingPin] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<string>("");

  // Verify cloud session cookie on mount (falls back to sessionStorage only in local unconfigured mode)
  useEffect(() => {
    let active = true;
    checkCloudAdminSession().then((status) => {
      if (!active) return;
      if (status.configured) {
        setIsAuthenticated(Boolean(staff) || status.authenticated);
      } else {
        try {
          setIsAuthenticated(window.sessionStorage?.getItem("ep_reception_auth") === "true");
        } catch {
          setIsAuthenticated(false);
        }
      }
      setIsCheckingAuth(false);
    });
    return () => {
      active = false;
    };
  }, [staff]);

  // Poll cloud state every 20s and on window focus while console is unlocked
  useEffect(() => {
    if (!isAuthenticated || !cloudStatus.configured) return;
    const poll = () => {
      if (document.visibilityState === "visible") {
        void pullFromCloud();
      }
    };
    const interval = setInterval(poll, 20_000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", poll);
    };
  }, [isAuthenticated, cloudStatus.configured]);

  // Doctor whose schedule is open in the editor
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<DeskTab>(staff ? "patients" : "opd");

  // Clock
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const clock = clinicClock(now);
  const todayKey = clock.dateKey;

  // Selected date for OPD register
  const [selectedDate, setSelectedDate] = useState<string>(() => clinicClock(new Date()).dateKey);
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

  // Print mode: false = OPD sheet / walk-in slip, true = counter QR poster
  const [posterPrint, setPosterPrint] = useState<boolean>(false);
  function printPoster() {
    setPosterPrint(true);
    const reset = () => {
      setPosterPrint(false);
      window.removeEventListener("afterprint", reset);
    };
    window.addEventListener("afterprint", reset);
    setTimeout(() => window.print(), 250);
  }

  // Broadcast copy toast
  const [broadcastToast, setBroadcastToast] = useState<string>("");

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Restore file input ref
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // Local tab sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const lastSyncTime = getLastSyncTime();
  const lastSyncDisplay = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  async function handleManualSync() {
    setIsSyncing(true);
    await pushToCloud();
    await pullFromCloud();
    setTimeout(() => {
      setIsSyncing(false);
      setBroadcastToast(
        cloudStatus.configured
          ? `Synced live with Cloudflare (${cloudStatus.storageDriver.toUpperCase()}). All devices updated.`
          : "Local sync complete across open browser tabs on this device.",
      );
      setTimeout(() => setBroadcastToast(""), 4000);
    }, 350);
  }

  // New Doctor Modal
  const [showNewDocModal, setShowNewDocModal] = useState<boolean>(false);
  const [newDocName, setNewDocName] = useState<string>("");
  const [newDocSpec, setNewDocSpec] = useState<string>("");
  const [newDocDegree, setNewDocDegree] = useState<string>("");
  const [newDocDay, setNewDocDay] = useState<number>(6); // Saturday
  const [newDocStart, setNewDocStart] = useState<string>("10:00");
  const [newDocEnd, setNewDocEnd] = useState<string>("14:00");

  // Change PIN state
  const [newPinValue, setNewPinValue] = useState<string>("");
  const [pinSaveState, setPinSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pinSaveMessage, setPinSaveMessage] = useState<string>("");

  async function verifyPin(pin: string) {
    setIsSubmittingPin(true);
    setPinError("");
    const res = await loginAdminPortal(pin);
    setIsSubmittingPin(false);
    if (res.ok) {
      setIsAuthenticated(true);
      setPinInput("");
      setPinError("");
    } else {
      setPinError(res.error || "Incorrect PIN. Please try again.");
      setTimeout(() => setPinInput(""), 600);
    }
  }

  async function handleUpdatePin(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = newPinValue.trim();
    if (trimmed.length < 4) {
      setPinSaveState("error");
      setPinSaveMessage("PIN must be at least 4 characters.");
      return;
    }
    setPinSaveState("saving");
    setPinSaveMessage("");
    const res = await updateAdminPortalPin(trimmed);
    if (!res.ok) {
      setPinSaveState("error");
      setPinSaveMessage(res.error || "Could not update PIN. Please try again.");
      return;
    }
    setNewPinValue("");
    const msg =
      res.mode === "cloud"
        ? "New security PIN saved and synced across all clinic devices."
        : "New security PIN saved on this device.";
    setPinSaveState("saved");
    setPinSaveMessage(msg);
    setBroadcastToast(msg);
    setTimeout(() => setBroadcastToast(""), 4500);
    setTimeout(() => {
      setPinSaveState((prev) => (prev === "saved" ? "idle" : prev));
    }, 6000);
  }

  async function handleLogout() {
    await logoutAdminPortal();
    if (staff) {
      window.location.reload();
      return;
    }
    setIsAuthenticated(false);
    setPinInput("");
  }

  // Owner summary figures from the patient database (lab reports, new registrations), for the selected date
  const [dbSummary, setDbSummary] = useState<Partial<OwnerSummaryStats> | null>(null);
  useEffect(() => {
    if (!staff) return;
    let active = true;
    api<{ stats: OwnerSummaryStats }>(`/api/staff/summary?date=${selectedDate}`)
      .then((r) => active && setDbSummary(r.stats))
      .catch(() => active && setDbSummary(null));
    return () => {
      active = false;
    };
  }, [staff, selectedDate, activeTab]);

  // Filtered appointments
  const filteredAppointments = appointments.filter((apt) => {
    const matchesDate = apt.date === selectedDate;
    const matchesDoc = doctorFilter === "all" || apt.doctorId === doctorFilter;
    return matchesDate && matchesDoc;
  });

  // Sort by time
  filteredAppointments.sort((a, b) => a.time.localeCompare(b.time));

  // Counts
  const countWaiting = filteredAppointments.filter(
    (a) => a.status === "confirmed" || a.status === "arrived",
  ).length;
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

    const token = generateToken(selectedDate, walkInDocId, true);

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
    setBroadcastToast("Broadcast copied to clipboard. Ready to paste in WhatsApp.");
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
          setBroadcastToast(`Restore complete: ${res.count} records restored.`);
          setTimeout(() => setBroadcastToast(""), 4000);
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
    const baseSlug = newDocName
      .replace(/^dr\.?\s*/i, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 14);
    const id = `${baseSlug || "specialist"}-${Date.now().toString(36).slice(-4)}`;
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
    setNewDocDegree("");
  }

  // Group appointments by date for historical day-by-day backups
  const dateGroups: Record<string, Appointment[]> = {};
  appointments.forEach((apt) => {
    if (!dateGroups[apt.date]) dateGroups[apt.date] = [];
    dateGroups[apt.date].push(apt);
  });
  const allRecordedDates = Object.keys(dateGroups).sort((a, b) => b.localeCompare(a));

  // ---------------------------------------------------------------------------
  // STAFF UNLOCK SCREEN — MATCHES SITE ARCHITECTURE & BOOKING PAGE LAYOUT
  // ---------------------------------------------------------------------------
  if (!mounted || !isAuthenticated) {
    return (
      <>
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-5 pt-6 pb-6 sm:px-6 sm:pt-9 sm:pb-8">
            <p className="eyebrow text-muted">Authorized Staff Console</p>
            <h1 className="mt-2.5 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Reception &amp;{" "}
              <em className="text-brand">
                admin portal
              </em>
            </h1>
            <p className="mt-2.5 max-w-2xl text-muted sm:text-lg leading-relaxed">
              Manage today&rsquo;s OPD register, walk-in tokens, specialist arrival status, and daily clinic reports.
            </p>
          </div>
        </section>

        <div className="bg-white">
          <section className="rounded-t-none sm:rounded-t-none border-t border-line/80 bg-ground">
            <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 pb-24 sm:px-6 sm:py-12 sm:pb-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Unlock Form Card */}
              <div className="card rounded-3xl p-6 sm:p-9">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                    <LockIcon className="size-5" />
                  </span>
                  <div>
                    <p className="eyebrow text-muted">Device Security</p>
                    <h2 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">
                      Unlock reception desk
                    </h2>
                  </div>
                </div>

                <p className="mt-3 text-base text-muted leading-relaxed">
                  Enter the clinic security PIN to open the live patient queue, walk-in slip printer, and specialist delay controls.
                </p>

                <form
                  className="mt-6 flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (pinInput.trim()) {
                      verifyPin(pinInput.trim());
                    }
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="clinic-admin-pass" className={fieldLabel}>
                      Admin Security PIN
                    </label>
                    <input
                      id="clinic-admin-pass"
                      type="password"
                      autoComplete="current-password"
                      autoFocus
                      required
                      placeholder="Enter security PIN"
                      value={pinInput}
                      onChange={(e) => {
                        setPinInput(e.target.value);
                        setPinError("");
                      }}
                      className={fieldInput}
                    />
                    {pinError && (
                      <p role="alert" className="mt-1 text-sm font-semibold text-emergency">
                        {pinError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                    <button
                      type="submit"
                      disabled={isCheckingAuth || isSubmittingPin}
                      className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60 transition-all cursor-pointer"
                    >
                      <span>{isSubmittingPin ? "Verifying…" : isCheckingAuth ? "Checking session…" : "Unlock Console"}</span>
                      <span className="inline-flex size-6 items-center justify-center rounded-lg bg-mint text-ink transition-transform duration-200 group-hover:translate-x-0.5">
                        <span aria-hidden="true" className="text-xs font-bold leading-none">
                          →
                        </span>
                      </span>
                    </button>

                    <Link
                      href="/"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border-[1.5px] border-ink px-5 text-base font-semibold text-ink hover:bg-ink hover:text-white transition-colors"
                    >
                      Back to Website
                    </Link>
                  </div>
                </form>
              </div>

              {/* Right Column: What lives inside the portal */}
              <div className="flex flex-col gap-5">
                <div className="card rounded-3xl p-6">
                  <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
                    Reception tools inside
                  </h2>
                  <ul className="mt-4 flex flex-col gap-4 text-base text-charcoal">
                    {[
                      {
                        Icon: CalendarCheckIcon,
                        title: "OPD queue & walk-in slips",
                        desc: "Register walk-in patients, lock consultation slots, and print token slips.",
                      },
                      {
                        Icon: RadarIcon,
                        title: "Live specialist delay radar",
                        desc: "Update doctor arrival or delay status on the home page and copy WhatsApp alerts.",
                      },
                      {
                        Icon: ReportIcon,
                        title: "Daily CSV backups & owner summary",
                        desc: "Export Excel sheets and send a 1-tap closing summary on WhatsApp.",
                      },
                    ].map(({ Icon, title, desc }) => (
                      <li key={title} className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60 mt-0.5">
                          <Icon className="size-4.5" />
                        </span>
                        <div>
                          <strong className="block font-semibold text-ink">{title}</strong>
                          <span className="text-sm text-muted leading-relaxed">{desc}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl bg-sand p-6">
                  <div className="flex items-center gap-2 text-ink">
                    <ShieldCheckIcon className="size-4" />
                    <span className="eyebrow">Local device storage</span>
                  </div>
                  <p className="mt-2 text-sm sm:text-base text-charcoal leading-relaxed">
                    Records stay locally on this reception device and sync across open browser tabs. Download a JSON or CSV backup at closing time.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED RECEPTION & OPD WORKSPACE
  // ---------------------------------------------------------------------------
  const currentDoctorObj = doctorFilter === "all" ? null : allDoctors.find((d) => d.id === doctorFilter);
  const ownerReportText = formatDailyOwnerSummary(
    selectedDate,
    doctorFilter,
    dbSummary
      ? {
          newRegistrations: dbSummary.newRegistrations,
          reportsUploaded: dbSummary.reportsUploaded,
          reportsPending: dbSummary.reportsPending,
          reportsDelivered: dbSummary.reportsDelivered,
          failedDeliveries: dbSummary.failedDeliveries,
        }
      : undefined,
  );
  const ownerWaUrl = `https://wa.me/${clinic.whatsapp}?text=${encodeURIComponent(ownerReportText)}`;

  type TabDef = { id: DeskTab; label: string; Icon: typeof CalendarCheckIcon; badge?: number };
  const tabs: TabDef[] = staff
    ? (
        [
          { id: "patients", label: "Patients", Icon: UserIcon },
          { id: "opd", label: "Appointments", Icon: CalendarCheckIcon, badge: countWaiting },
          { id: "labs", label: "Lab Reports", Icon: ReportIcon },
          { id: "doctors", label: "Doctors", Icon: StethoscopeIcon },
          { id: "radar", label: "Specialists & Availability", Icon: RadarIcon },
          { id: "notify", label: "WhatsApp", Icon: WhatsAppIcon },
          { id: "stats", label: "Statistics", Icon: ReportIcon },
          { id: "backups", label: "Owner Reports", Icon: DownloadIcon },
          { id: "search", label: "Find Token", Icon: SearchIcon },
          { id: "staff", label: staff.role === "owner" ? "Staff" : "My Account", Icon: ShieldCheckIcon },
        ] as TabDef[]
      ).filter((t) => staff.role === "owner" || t.id !== "backups")
    : [
        { id: "opd", label: "OPD Queue", Icon: CalendarCheckIcon, badge: countWaiting },
        { id: "radar", label: "Delay Radar", Icon: RadarIcon },
        { id: "doctors", label: "Doctors & Timings", Icon: StethoscopeIcon },
        { id: "backups", label: "Backups & Reports", Icon: ReportIcon },
        { id: "search", label: "Patient Search", Icon: SearchIcon },
      ];

  const searchMatches = searchQuery.trim()
    ? appointments.filter((a) => {
        const q = searchQuery.trim().toLowerCase();
        return (
          a.patientName.toLowerCase().includes(q) ||
          (a.patientAddress && a.patientAddress.toLowerCase().includes(q)) ||
          a.patientPhone.includes(q) ||
          a.token.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <>
      {/* Hidden file input for JSON restore */}
      <input
        ref={restoreFileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileRestore}
        className="hidden"
      />

      {/* Screen View (hidden on print) */}
      <div className="no-print">
        {/* Crisp Pure-White Hero Intro Band (matches Homepage & Inner Pages) */}
        <section className="bg-white">
          <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {/* Status Pills Row */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ground px-3 py-1 text-xs font-semibold text-charcoal tabular-nums lining-nums">
                  <ClockIcon className="size-3.5 text-ink" />
                  <span>{fromMinutes(clock.minutes)} IST</span>
                </span>

                <button
                  type="button"
                  onClick={handleManualSync}
                  title={
                    cloudStatus.configured
                      ? `Connected to Cloudflare ${cloudStatus.storageDriver.toUpperCase()} — click to sync now`
                      : "Local device mode — attach EP_KV or EP_DB in Cloudflare Pages to enable cross-device cloud sync"
                  }
                  className="inline-flex items-center gap-1.5 rounded-md border border-brand-line bg-brand-tint/65 px-3 py-1 text-xs font-semibold text-ink hover:bg-brand-tint transition-colors cursor-pointer"
                >
                  <RefreshIcon className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>
                    {isSyncing
                      ? "Syncing…"
                      : cloudStatus.configured
                        ? `Cloud Live (${cloudStatus.storageDriver.toUpperCase()}) · ${lastSyncDisplay}`
                        : `Local Mode · ${lastSyncDisplay}`}
                  </span>
                </button>
                {!staff && cloudStatus.usingDefaultPin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("backups")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
                  >
                    <span>Set Custom PIN →</span>
                  </button>
                )}
              </div>

              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
                {staff ? "Clinic" : "Reception"} &amp;{" "}
                <em className="text-brand">
                  {staff ? "dashboard" : "OPD desk"}
                </em>
              </h1>
              {staff && (
                <p className="mt-2 text-sm font-semibold text-charcoal">
                  Signed in as {staff.displayName} · {ROLE_LABEL[staff.role]}
                </p>
              )}
              <p className="mt-2 max-w-xl text-muted sm:text-lg leading-relaxed">
                {clinic.name} · {dateLabel(selectedDate)}
              </p>
            </div>

            {/* Primary Console Actions */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowWalkInModal(true);
                  setWalkInDocId(doctorFilter !== "all" ? doctorFilter : allDoctors[0]?.id || "");
                }}
                className="group inline-flex min-h-12 items-center justify-center gap-2.5 rounded-xl bg-brand px-5 text-sm sm:text-base font-semibold text-white hover:bg-brand-dark transition-all cursor-pointer"
              >
                <span>Add Walk-In</span>
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-mint text-ink">
                  <PlusIcon className="size-3.5" />
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Lock reception console"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink bg-white px-4 text-sm sm:text-base font-semibold text-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
              >
                <LockIcon className="size-4" />
                <span>{staff ? "Sign out" : "Lock"}</span>
              </button>
            </div>
          </div>
        </section>

        {/* Rounded-Top Sage-Mist Workspace Band (matches DayPicker on Homepage) */}
        <div className="bg-white">
          <section className="rounded-t-none sm:rounded-t-none border-t border-line/80 bg-ground">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-16">
              {/* Floating Broadcast / Action Toast (always visible regardless of scroll position) */}
              {broadcastToast && (
                <div
                  role="status"
                  aria-live="polite"
                  className="fade-in fixed inset-x-4 bottom-20 z-50 flex items-center justify-between gap-4 rounded-2xl bg-brand px-5 py-3.5 text-sm font-semibold text-white shadow-elevated ring-1 ring-white/15 sm:inset-x-auto sm:right-6 sm:max-w-md lg:bottom-6"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-lg bg-mint text-ink">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <span>{broadcastToast}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setBroadcastToast("")}
                    className="text-xs font-bold uppercase tracking-wider text-mint hover:underline cursor-pointer shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Pill Filter Tabs (matches DoctorDirectory speciality chips) */}
              <nav
                aria-label="Admin sections"
                className="-mx-5 flex w-[calc(100%+2.5rem)] max-w-none gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0"
              >
                {tabs.map(({ id, label, Icon, badge }) => {
                  const on = activeTab === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setActiveTab(id)}
                      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-md px-4 text-sm sm:text-base font-semibold transition-colors cursor-pointer ${
                        on ? "bg-ink text-white" : "card text-charcoal hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span>{label}</span>
                      {badge !== undefined && badge > 0 && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums lining-nums ${
                            on ? "bg-mint text-ink" : "bg-brand-tint text-ink ring-1 ring-brand-line/70"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {setupMode && !staff && <OwnerSetupCard />}
              {databaseMissing && !staff && <DatabaseMissingCard />}

              {staff && activeTab === "patients" && <PatientsPanel session={staff} doctors={allDoctors} />}
              {staff && activeTab === "labs" && <LabReportsPanel session={staff} />}
              {staff && activeTab === "notify" && <NotificationsPanel session={staff} />}
              {staff && activeTab === "stats" && <StatsPanel />}
              {staff && activeTab === "staff" && <StaffPanel session={staff} />}

              {/* ================================================================= */}
              {/* TAB 1: OPD PATIENT REGISTER                                       */}
              {/* ================================================================= */}
              {activeTab === "opd" && (
                <div className="fade-in flex flex-col gap-6">
                  {/* Filter & Export Controls Card */}
                  <div className="card rounded-3xl p-5 sm:p-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex flex-wrap items-end gap-2.5 sm:flex-nowrap min-w-0">
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <label htmlFor="date-select" className={fieldLabel}>
                          OPD Date
                        </label>
                        <input
                          id="date-select"
                          type="date"
                          value={selectedDate}
                          onChange={(e) => setSelectedDate(e.target.value)}
                          className="min-h-11 rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold text-ink tabular-nums lining-nums focus:border-brand focus:outline-none"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedDate(todayKey)}
                        className={`min-h-11 shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition-colors cursor-pointer ${
                          selectedDate === todayKey
                            ? "border-brand bg-brand text-white"
                            : "border-line-strong bg-white text-ink hover:border-brand"
                        }`}
                      >
                        Today
                      </button>

                      <div className="flex w-full sm:w-58 flex-col gap-1.5 min-w-0">
                        <label htmlFor="doc-select" className={fieldLabel}>
                          Specialist Filter
                        </label>
                        <select
                          id="doc-select"
                          value={doctorFilter}
                          onChange={(e) => setDoctorFilter(e.target.value)}
                          className="min-h-11 w-full truncate rounded-xl border border-line-strong bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
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

                    {/* Export, Print & Owner Summary Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadCsv(selectedDate)}
                        title="Download CSV spreadsheet for this date"
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-line bg-brand-tint/75 px-3.5 text-sm font-semibold text-ink whitespace-nowrap hover:bg-brand-tint transition-colors cursor-pointer"
                      >
                        <DownloadIcon className="size-4 shrink-0" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line-strong bg-white px-3.5 text-sm font-semibold text-ink whitespace-nowrap hover:bg-ground transition-colors cursor-pointer"
                      >
                        <PrinterIcon className="size-4 shrink-0" />
                        <span>Print Sheet</span>
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
                        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white whitespace-nowrap hover:bg-brand-dark transition-colors"
                      >
                        <WhatsAppIcon className="size-4 shrink-0" />
                        <span>
                          {doctorFilter === "all"
                            ? "Summary to Owner"
                            : `Report ${currentDoctorObj?.name?.replace(/^Dr\.\s*/, "") || "Doctor"}`}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* 4 KPI Summary Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                    <div className="card rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                      <span className="eyebrow text-muted">Total Booked</span>
                      <p className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink tabular-nums lining-nums">
                        {filteredAppointments.length}
                      </p>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted tabular-nums lining-nums">
                        <strong className="font-semibold text-ink">
                          {filteredAppointments.filter((a) => a.type === "online").length}
                        </strong>{" "}
                        online ·{" "}
                        <strong className="font-semibold text-ink">
                          {filteredAppointments.filter((a) => a.type === "walk_in").length}
                        </strong>{" "}
                        walk-in
                        {countCancelled > 0 ? ` · ${countCancelled} cancelled` : ""}
                      </p>
                    </div>

                    <div className="card rounded-2xl sm:rounded-3xl p-4 sm:p-5">
                      <span className="eyebrow text-charcoal flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-amber-500" />
                        Waiting
                      </span>
                      <p className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink tabular-nums lining-nums">
                        {countWaiting}
                      </p>
                      <p className="mt-1.5 text-xs sm:text-sm text-muted">In reception lounge</p>
                    </div>

                    <div className="rounded-2xl sm:rounded-3xl border border-night-line bg-brand p-4 sm:p-5 text-white">
                      <span className="eyebrow text-mint flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-mint" />
                        In Cabin
                      </span>
                      <p className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-white tabular-nums lining-nums">
                        {countInConsult}
                      </p>
                      <p className="mt-1.5 text-xs sm:text-sm text-night-muted">With specialist now</p>
                    </div>

                    <div className="rounded-2xl sm:rounded-3xl border border-brand-line bg-brand-tint/55 p-4 sm:p-5">
                      <span className="eyebrow text-ink flex items-center gap-1.5">
                        <span className="size-2 rounded-full bg-[#22A05B]" />
                        Completed
                      </span>
                      <p className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink tabular-nums lining-nums">
                        {countCompleted}
                      </p>
                      <p className="mt-1.5 text-xs sm:text-sm text-charcoal">Consultations done</p>
                    </div>
                  </div>

                  {/* Patient Queue List */}
                  {filteredAppointments.length === 0 ? (
                    <div className="card rounded-3xl p-10 sm:p-14 text-center">
                      <span className="mx-auto mb-4 flex size-13 items-center justify-center rounded-2xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                        <StethoscopeIcon className="size-6" />
                      </span>
                      <h2 className="font-display text-xl sm:text-2xl font-medium tracking-tight text-ink">
                        No patients scheduled for {dateLabel(selectedDate)}
                      </h2>
                      <p className="mx-auto mt-2 max-w-md text-sm sm:text-base text-muted leading-relaxed">
                        Online bookings made on the website (instantly confirmed) and walk-ins added with{" "}
                        <strong className="font-semibold text-ink">Add Walk-In</strong> appear here in slot order.
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {filteredAppointments.map((apt) => {
                        const statusStyles: Record<AppointmentStatus, string> = {
                          confirmed: "bg-amber-50 text-amber-950 border-amber-200",
                          arrived: "bg-sand text-ink border-line-strong",
                          in_consultation: "bg-brand text-mint border-brand",
                          completed: "bg-brand-tint text-ink border-brand-line",
                          cancelled: "bg-rose-50 text-rose-900 border-rose-200",
                        };

                        const callMsg = `Hello ${apt.patientName}, your token #${apt.token} for ${apt.doctorName} at Eternal Polyclinic, Sopore is now being called. Please proceed to Consultation Cabin.`;
                        const callWaUrl = `https://wa.me/91${apt.patientPhone}?text=${encodeURIComponent(callMsg)}`;

                        return (
                          <li
                            key={apt.token}
                            className={`card rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between transition-colors ${
                              apt.status === "in_consultation"
                                ? "border-brand-line bg-brand-tint/20 ring-1 ring-brand-line"
                                : "hover:border-line-strong"
                            }`}
                          >
                            {/* Left Block: Token Badge + Patient Details */}
                            <div className="flex items-start gap-3.5 sm:gap-5 min-w-0">
                              <div className="flex min-w-27 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand px-3.5 py-2.5 text-center text-white">
                                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-night-muted">
                                  Token
                                </span>
                                <span className="font-display text-base sm:text-lg font-semibold tracking-tight text-mint tabular-nums lining-nums">
                                  {apt.token}
                                </span>
                                <span className="mt-0.5 text-xs font-medium text-white/80 tabular-nums lining-nums">
                                  {formatTime(apt.time)}
                                </span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight text-ink">
                                    {apt.patientName}
                                  </h3>

                                  {apt.patientAddress ? (
                                    <span className="inline-flex items-center gap-1 rounded-md border border-brand-line bg-brand-tint/75 px-2.5 py-0.5 text-xs font-semibold text-ink">
                                      <MapPinIcon className="size-3 shrink-0" />
                                      <span>{apt.patientAddress}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-md border border-line bg-ground px-2.5 py-0.5 text-xs text-muted">
                                      Area not added
                                    </span>
                                  )}

                                  <span
                                    className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                                      apt.type === "walk_in"
                                        ? "border-line-strong bg-ground text-charcoal"
                                        : "border-brand-line bg-brand-tint text-ink"
                                    }`}
                                  >
                                    {apt.type === "walk_in" ? "Walk-In" : "Online"}
                                  </span>
                                  {apt.whatsappSent && (
                                    <span className="rounded-md border border-brand-line bg-white px-2.5 py-0.5 text-[11px] font-bold text-ink">
                                      ✓ WA Sent
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                                  <span className="inline-flex items-center gap-1.5 font-semibold text-charcoal">
                                    <StethoscopeIcon className="size-3.5 shrink-0 text-ink" />
                                    <span>
                                      {apt.doctorName} ({apt.speciality})
                                    </span>
                                  </span>
                                  <span aria-hidden="true">·</span>
                                  <span className="inline-flex items-center gap-1 tabular-nums lining-nums">
                                    <PhoneIcon className="size-3.5 shrink-0" />
                                    <span>+91 {apt.patientPhone}</span>
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Right Block: Workflow Controls */}
                            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3.5 lg:border-t-0 lg:pt-0">
                              <select
                                aria-label={`Appointment status for ${apt.patientName}`}
                                value={apt.status}
                                onChange={(e) =>
                                  updateAppointmentStatus(apt.token, e.target.value as AppointmentStatus)
                                }
                                className={`min-h-11 rounded-xl border px-3.5 py-1.5 text-xs sm:text-sm font-semibold outline-none cursor-pointer ${statusStyles[apt.status]}`}
                              >
                                <option value="confirmed">Confirmed (Waiting)</option>
                                <option value="arrived">Arrived in Clinic</option>
                                <option value="in_consultation">With Doctor (Cabin)</option>
                                <option value="completed">Consultation Done</option>
                                <option value="cancelled">Cancelled / No Show</option>
                              </select>

                              <a
                                href={callWaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Message patient on WhatsApp"
                                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                              >
                                <WhatsAppIcon className="size-4 shrink-0" />
                                <span>Call In</span>
                              </a>

                              <a
                                href={`tel:+91${apt.patientPhone}`}
                                aria-label={`Call ${apt.patientName}`}
                                title="Call patient mobile"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-line-strong bg-white px-3 text-ink hover:bg-ground transition-colors"
                              >
                                <PhoneIcon className="size-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Cancel token ${apt.token} for ${apt.patientName}?`)) {
                                    deleteAppointment(apt.token);
                                  }
                                }}
                                aria-label={`Remove token ${apt.token}`}
                                title="Remove token"
                                className="inline-flex min-h-11 items-center justify-center rounded-xl px-2.5 text-muted hover:bg-rose-50 hover:text-emergency transition-colors cursor-pointer"
                              >
                                <CloseIcon className="size-4" />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 2: LIVE DOCTOR DELAY RADAR                                    */}
              {/* ================================================================= */}
              {activeTab === "radar" && (
                <div className="fade-in flex flex-col gap-6">
                  <div className="dot-grid-night rounded-3xl border border-night-line bg-brand p-6 sm:p-8 text-white">
                    <p className="eyebrow text-mint">Real-Time Website Banner</p>
                    <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                      Live OPD arrival &amp; delay radar
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm sm:text-base text-night-muted leading-relaxed">
                      When a visiting specialist is on the way from Srinagar, delayed in surgery, or seated in the cabin, update their live state below. The home page updates immediately and prepares a WhatsApp notice.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {allDoctors.map((doc) => {
                      const live = doctorStatuses[doc.id] ?? getDoctorLiveStatus(doc.id);
                      const broadcastMsg = doctorDelayBroadcastText(
                        doc.name ?? doc.speciality,
                        live,
                        dateLabel(selectedDate),
                      );

                      return (
                        <div
                          key={doc.id}
                          className="card rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <DoctorMark doctor={doc} className="size-12 shrink-0 rounded-xl" />
                                <div className="min-w-0">
                                  <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight text-ink">
                                    {doc.name ?? doc.speciality}
                                  </h3>
                                  <p className="text-sm font-semibold text-charcoal">{doc.speciality}</p>
                                  <p className="text-xs text-muted mt-0.5">{doc.credentials ?? doc.degree}</p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                                  live.state === "in_clinic"
                                    ? "border-brand-line bg-brand-tint text-ink"
                                    : live.state === "delayed"
                                    ? "border-amber-200 bg-amber-50 text-amber-950"
                                    : live.state === "cancelled"
                                    ? "border-rose-200 bg-rose-50 text-rose-900"
                                    : "border-line bg-ground text-charcoal"
                                }`}
                              >
                                <span
                                  className={`size-2 rounded-full ${
                                    live.state === "in_clinic"
                                      ? "bg-[#22A05B]"
                                      : live.state === "delayed"
                                      ? "bg-amber-500"
                                      : live.state === "cancelled"
                                      ? "bg-rose-600"
                                      : "bg-muted"
                                  }`}
                                />
                                <span>
                                  {live.state === "in_clinic"
                                    ? "In Clinic"
                                    : live.state === "delayed"
                                    ? `Delayed ~${live.delayMinutes ?? 30}m`
                                    : live.state === "cancelled"
                                    ? "Cancelled"
                                    : "Scheduled"}
                                </span>
                              </span>
                            </div>

                            {/* State Switcher */}
                            <div className="mt-4 flex flex-col gap-2">
                              <span className={fieldLabel}>Live Doctor Status</span>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                <button
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "scheduled")}
                                  className={`min-h-11 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                    live.state === "scheduled"
                                      ? "border-brand bg-brand text-white"
                                      : "border-line-strong bg-white text-charcoal hover:border-brand"
                                  }`}
                                >
                                  Scheduled
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "in_clinic")}
                                  className={`min-h-11 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                    live.state === "in_clinic"
                                      ? "border-brand-line bg-brand-tint font-bold text-ink"
                                      : "border-line-strong bg-white text-ink hover:bg-brand-tint/40"
                                  }`}
                                >
                                  In Clinic
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "delayed", live.delayMinutes || 30)}
                                  className={`min-h-11 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                    live.state === "delayed"
                                      ? "border-amber-300 bg-amber-100 font-bold text-amber-950"
                                      : "border-line-strong bg-white text-charcoal hover:bg-amber-50"
                                  }`}
                                >
                                  Delayed
                                </button>

                                <button
                                  type="button"
                                  onClick={() => updateDoctorRadar(doc.id, "cancelled")}
                                  className={`min-h-11 rounded-xl border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                    live.state === "cancelled"
                                      ? "border-rose-300 bg-rose-100 font-bold text-rose-950"
                                      : "border-line-strong bg-white text-charcoal hover:bg-rose-50"
                                  }`}
                                >
                                  Cancelled
                                </button>
                              </div>
                            </div>

                            {/* Delay Configuration */}
                            {live.state === "delayed" && (
                              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-amber-950">
                                    Estimated Delay
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {[15, 30, 45, 60, 90].map((min) => (
                                      <button
                                        key={min}
                                        type="button"
                                        onClick={() => updateDoctorRadar(doc.id, "delayed", min)}
                                        className={`min-h-8 rounded-lg px-2.5 text-xs font-semibold tabular-nums lining-nums transition-colors cursor-pointer ${
                                          (live.delayMinutes ?? 30) === min
                                            ? "bg-brand text-white"
                                            : "border border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                                        }`}
                                      >
                                        {min}m
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <input
                                  type="text"
                                  placeholder="Optional note (e.g. Traffic near Sangrama / SKIMS OT)"
                                  value={live.note ?? ""}
                                  onChange={(e) =>
                                    updateDoctorRadar(doc.id, "delayed", live.delayMinutes, e.target.value)
                                  }
                                  className="min-h-11 rounded-xl border border-amber-300 bg-white px-3.5 text-sm text-ink outline-none focus:border-brand"
                                />
                              </div>
                            )}
                          </div>

                          {/* Broadcast WhatsApp Preview & Copy */}
                          {broadcastMsg && (
                            <div className="flex flex-col gap-2 border-t border-line pt-4">
                              <div className="flex items-center justify-between gap-2">
                                <span className={fieldLabel}>WhatsApp Broadcast Notice</span>
                                <button
                                  type="button"
                                  onClick={() => copyBroadcast(broadcastMsg)}
                                  className="inline-flex items-center gap-1.5 text-xs font-bold text-ink underline decoration-brand-line hover:decoration-ink cursor-pointer"
                                >
                                  <CopyIcon className="size-3.5" />
                                  <span>Copy Message</span>
                                </button>
                              </div>
                              <pre className="whitespace-pre-wrap rounded-2xl border border-line bg-ground p-3.5 font-sans text-xs text-charcoal leading-relaxed">
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

              {/* ================================================================= */}
              {/* TAB 3: DOCTOR TIMINGS & LEAVE MANAGER                             */}
              {/* ================================================================= */}
              {activeTab === "doctors" && (
                <div className="fade-in flex flex-col gap-6">
                  <div className="card rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="eyebrow text-muted">Specialist Roster</p>
                      <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold tracking-tight text-ink">
                        OPD days, leave &amp; visiting specialists
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Mark a doctor on leave to pause online slot booking, or add a new visiting specialist.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowNewDocModal(true)}
                      className="inline-flex min-h-12 items-center gap-2.5 rounded-xl bg-brand px-5 text-sm sm:text-base font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
                    >
                      <span>Register Specialist</span>
                      <span className="inline-flex size-6 items-center justify-center rounded-lg bg-mint text-ink">
                        <PlusIcon className="size-3.5" />
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {allDoctors.map((doc) => {
                      const isOnLeave = doc.availability?.toLowerCase().includes("leave");

                      return (
                        <div
                          key={doc.id}
                          className="card rounded-2xl sm:rounded-3xl p-5 sm:p-6 flex flex-col justify-between gap-5"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3.5 min-w-0">
                                <DoctorMark doctor={doc} className="size-12 shrink-0 rounded-xl" />
                                <div className="min-w-0">
                                  <h3 className="font-display text-lg sm:text-xl font-medium tracking-tight text-ink">
                                    {doc.name ?? doc.speciality}
                                  </h3>
                                  <p className="text-sm font-semibold text-charcoal">{doc.speciality}</p>
                                  <p className="text-xs text-muted mt-0.5">{doc.credentials ?? doc.degree}</p>
                                </div>
                              </div>

                              {isOnLeave ? (
                                <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-3 py-0.5 text-xs font-bold text-rose-900">
                                  On Leave
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-md border border-brand-line bg-brand-tint px-3 py-0.5 text-xs font-bold text-ink">
                                  Active OPD
                                </span>
                              )}
                            </div>

                            {/* OPD Sessions */}
                            <div className="mt-4 flex flex-col gap-1.5">
                              <span className={fieldLabel}>Sitting Schedule</span>
                              {doc.opd.length > 0 ? (
                                doc.opd.map((s, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between rounded-xl border border-line bg-ground px-3.5 py-2 text-sm"
                                  >
                                    <span className="font-semibold text-ink">{DAY_NAMES[s.day]}</span>
                                    <span className="text-muted tabular-nums lining-nums">
                                      {formatTime(s.start)} – {formatTime(s.end)}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="rounded-xl border border-line bg-ground px-3.5 py-2 text-sm text-muted">
                                  By appointment via reception
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const newLeave = !isOnLeave;
                                  setDoctorOverride(doc.id, newLeave ? { onLeave: true } : { onLeave: false, leaveFrom: null, leaveUntil: null });
                                }}
                                className={`min-h-10 rounded-xl border px-3.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
                                  isOnLeave
                                    ? "border-brand-line bg-brand-tint text-ink hover:bg-[#D3E4EC]"
                                    : "border-line-strong bg-white text-charcoal hover:border-rose-300 hover:bg-rose-50 hover:text-emergency"
                                }`}
                              >
                                {isOnLeave ? "End Leave" : "Mark On Leave"}
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const label = doc.name ?? doc.speciality;
                                  if (
                                    window.confirm(
                                      `Are you sure you want to remove ${label} from the active clinic roster?`,
                                    )
                                  ) {
                                    removeCustomDoctor(doc.id);
                                    setDoctorOverride(doc.id, { deactivated: true, onLeave: true });
                                    setBroadcastToast(`${label} removed from active roster.`);
                                    setTimeout(() => setBroadcastToast(""), 3500);
                                  }
                                }}
                                className="min-h-10 rounded-xl px-3 text-xs sm:text-sm font-semibold text-muted hover:bg-rose-50 hover:text-emergency transition-colors cursor-pointer"
                                title="Remove doctor from active roster"
                              >
                                Remove
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setEditingDoctorId(doc.id)}
                              className="min-h-10 rounded-xl border border-line-strong bg-white px-3.5 text-xs sm:text-sm font-semibold text-ink hover:border-brand transition-colors cursor-pointer"
                            >
                              Edit schedule
                            </button>

                            <Link
                              href={`/book?doctor=${doc.id}`}
                              target="_blank"
                              className="inline-flex min-h-10 items-center text-sm font-semibold text-ink underline decoration-brand-line hover:decoration-ink"
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

              {editingDoctorId && allDoctors.find((d) => d.id === editingDoctorId) && (
                <DoctorScheduleEditor
                  doctor={allDoctors.find((d) => d.id === editingDoctorId)!}
                  appointments={appointments}
                  onClose={() => setEditingDoctorId(null)}
                  onSaved={(msg) => {
                    setEditingDoctorId(null);
                    setBroadcastToast(msg);
                    setTimeout(() => setBroadcastToast(""), 4000);
                  }}
                />
              )}

              {/* ================================================================= */}
              {/* TAB 4: DAILY BACKUPS, TAB SYNC & OWNER REPORTING                  */}
              {/* ================================================================= */}
              {activeTab === "backups" && (
                <div className="fade-in flex flex-col gap-6">
                  {/* Owner Daily Report Dark Band */}
                  <div className="rounded-3xl border border-night-line bg-brand p-6 sm:p-8 text-white flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl">
                      <span className="eyebrow text-mint">Closing Time Summary</span>
                      <h2 className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                        Daily OPD summary on WhatsApp
                      </h2>
                      <p className="mt-2 text-sm sm:text-base text-night-muted leading-relaxed">
                        Send today&rsquo;s total patient counts, completed consultations, and doctor breakdown directly to the clinic owner&rsquo;s WhatsApp in one tap.
                      </p>
                    </div>

                    <a
                      href={ownerWaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-mint px-6 text-sm sm:text-base font-bold text-ink hover:bg-[#D3E4EC] transition-colors"
                    >
                      <WhatsAppIcon className="size-5 shrink-0" />
                      <span>
                        {doctorFilter === "all"
                          ? "Send All Doctors Summary"
                          : `Send ${currentDoctorObj?.name || "Doctor"} Summary`}
                      </span>
                    </a>
                  </div>

                  {/* 3 Utility Cards (matches /services icon cards) */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Full JSON Backup */}
                    <div className="card rounded-3xl p-6 flex flex-col justify-between gap-5">
                      <div>
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60">
                          <DownloadIcon className="size-6" />
                        </span>
                        <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
                          Full JSON backup
                        </h3>
                        <p className="mt-1.5 text-sm text-muted leading-relaxed">
                          Download or restore all appointments, walk-ins, schedule overrides, and custom specialists stored on this device.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                        <button
                          type="button"
                          onClick={downloadFullJsonBackup}
                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-xs sm:text-sm font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
                        >
                          <DownloadIcon className="size-4 shrink-0" />
                          <span>Download JSON</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => restoreFileInputRef.current?.click()}
                          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-white px-3.5 text-xs sm:text-sm font-semibold text-ink hover:bg-ground transition-colors cursor-pointer"
                        >
                          <RefreshIcon className="size-4 shrink-0" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </div>

                    {/* Cloudflare Cross-Device Sync */}
                    <div className="card rounded-3xl p-6 flex flex-col justify-between gap-5">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60">
                            <RefreshIcon className="size-6" />
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
                              cloudStatus.configured
                                ? "bg-brand-tint border border-brand-line text-ink"
                                : "bg-sand border border-line text-charcoal"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                cloudStatus.configured ? "bg-[#22A05B]" : "bg-amber-500"
                              }`}
                              aria-hidden="true"
                            />
                            {cloudStatus.configured
                              ? `Cloudflare ${cloudStatus.storageDriver.toUpperCase()} Live`
                              : "Local Device Mode"}
                          </span>
                        </div>
                        <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
                          Cross-device cloud sync
                        </h3>
                        <p className="mt-1.5 text-sm text-muted leading-relaxed">
                          {cloudStatus.configured ? (
                            <>
                              Live OPD tokens, booked slots, and doctor delay alerts sync automatically across reception tablets, the owner&rsquo;s phone, and public pages. Last synced:{" "}
                              <strong className="font-semibold text-ink tabular-nums lining-nums">
                                {lastSyncDisplay}
                              </strong>
                              .
                            </>
                          ) : (
                            <>
                              Currently saving on this device only. To activate live multi-device sync, open{" "}
                              <strong className="font-semibold text-ink">
                                Cloudflare Pages → Settings → Bindings
                              </strong>{" "}
                              and attach a KV namespace named <code className="rounded bg-sand px-1.5 py-0.5 text-xs font-bold text-ink">EP_KV</code>{" "}
                              (or D1 database <code className="rounded bg-sand px-1.5 py-0.5 text-xs font-bold text-ink">EP_DB</code>).
                            </>
                          )}
                        </p>
                      </div>

                      <div className="border-t border-line pt-4">
                        <button
                          type="button"
                          onClick={handleManualSync}
                          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-line bg-brand-tint/80 px-4 text-xs sm:text-sm font-semibold text-ink hover:bg-brand-tint transition-colors cursor-pointer"
                        >
                          <RefreshIcon className={`size-4 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
                          <span>{cloudStatus.configured ? "Sync Cloud Now" : "Broadcast Local Sync"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Admin Security PIN (old shared-PIN mode only) */}
                    {!staff && (
                    <div className="card rounded-3xl p-6 flex flex-col justify-between gap-5">
                      <div>
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60">
                          <LockIcon className="size-6" />
                        </span>
                        <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
                          Admin security PIN
                        </h3>
                        <p className="mt-1.5 text-sm text-muted leading-relaxed">
                          {cloudStatus.configured
                            ? "Updates the encrypted server-verified PIN across all reception tablets and phones."
                            : "Update the staff PIN required to unlock this reception console on this device."}
                        </p>
                      </div>

                      <form onSubmit={handleUpdatePin} className="flex flex-col gap-2.5 border-t border-line pt-4">
                        <div className="flex gap-2">
                          <input
                            type="password"
                            aria-label="New admin PIN"
                            placeholder="New PIN (4+ chars)"
                            value={newPinValue}
                            onChange={(e) => {
                              setNewPinValue(e.target.value);
                              if (pinSaveState !== "idle") {
                                setPinSaveState("idle");
                                setPinSaveMessage("");
                              }
                            }}
                            className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-white px-3 text-sm text-ink outline-none focus:border-brand"
                          />
                          <button
                            type="submit"
                            disabled={pinSaveState === "saving"}
                            className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-60 ${
                              pinSaveState === "saved"
                                ? "bg-brand-tint text-ink ring-1 ring-brand-line"
                                : "bg-brand text-white hover:bg-brand-dark"
                            }`}
                          >
                            {pinSaveState === "saving" ? (
                              <>
                                <RefreshIcon className="size-3.5 animate-spin" />
                                <span>Saving…</span>
                              </>
                            ) : pinSaveState === "saved" ? (
                              <>
                                <CheckIcon className="size-3.5 text-[#177A44]" />
                                <span>PIN Saved</span>
                              </>
                            ) : (
                              <span>Save PIN</span>
                            )}
                          </button>
                        </div>

                        {pinSaveState === "saved" && pinSaveMessage && (
                          <p
                            role="status"
                            aria-live="polite"
                            className="flex items-center gap-2 rounded-xl border border-brand-line bg-brand-tint/70 px-3 py-2 text-xs font-semibold text-ink"
                          >
                            <CheckIcon className="size-3.5 shrink-0 text-[#177A44]" />
                            <span>{pinSaveMessage}</span>
                          </p>
                        )}

                        {pinSaveState === "error" && pinSaveMessage && (
                          <p role="alert" className="text-xs font-semibold text-emergency">
                            {pinSaveMessage}
                          </p>
                        )}
                      </form>
                    </div>
                    )}
                  </div>

                  {/* WhatsApp auto-confirmation status + counter QR poster */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="card rounded-3xl p-6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60">
                          <WhatsAppIcon className="size-6" />
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold ${
                            cloudStatus.whatsappChannel !== "unconfigured"
                              ? "border-brand-line bg-brand-tint text-ink"
                              : "border-amber-200 bg-amber-50 text-amber-900"
                          }`}
                        >
                          {cloudStatus.whatsappChannel === "meta_cloud_api"
                            ? "Meta Cloud API active"
                            : cloudStatus.whatsappChannel === "twilio"
                              ? "Twilio active"
                              : cloudStatus.whatsappChannel === "webhook"
                                ? "Gateway webhook active"
                                : "Awaiting API credentials"}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
                        Automatic WhatsApp confirmation
                      </h3>
                      <p className="mt-1.5 text-sm text-muted leading-relaxed">
                        {cloudStatus.whatsappChannel !== "unconfigured"
                          ? "Every online booking and walk-in token is sent to the patient's WhatsApp automatically. Rows marked ✓ WA Sent were delivered to the gateway."
                          : "Bookings are confirmed on screen, but automatic WhatsApp messages need a WhatsApp Business API token (Meta Cloud API, Twilio or a gateway webhook) added to Cloudflare secrets."}
                      </p>
                    </div>

                    <div className="card rounded-3xl p-6 flex flex-col justify-between gap-5">
                      <div>
                        <span className="flex size-12 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/60">
                          <PrinterIcon className="size-6" />
                        </span>
                        <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink">
                          Counter QR poster
                        </h3>
                        <p className="mt-1.5 text-sm text-muted leading-relaxed">
                          Print an A4 poster with QR codes for online booking and for collecting lab &amp; scan reports on WhatsApp.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={printPoster}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
                      >
                        <PrinterIcon className="size-4 shrink-0" />
                        <span>Print Counter QR Poster</span>
                      </button>
                    </div>
                  </div>

                  {/* Historical OPD Records by Date */}
                  <div className="card rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <h3 className="font-display text-xl font-medium tracking-tight text-ink">
                          Historical OPD records by date
                        </h3>
                        <p className="mt-0.5 text-sm text-muted">
                          Download any recorded day as a spreadsheet-ready CSV file.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => downloadCsv()}
                        className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-ink underline decoration-brand-line hover:decoration-ink cursor-pointer"
                      >
                        <DownloadIcon className="size-4" />
                        <span>Export All-Time CSV</span>
                      </button>
                    </div>

                    {allRecordedDates.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted">No recorded OPD sheets on this device yet.</p>
                    ) : (
                      <div className="flex flex-col divide-y divide-line">
                        {allRecordedDates.map((dateKey) => {
                          const dayApts = dateGroups[dateKey] || [];
                          const completed = dayApts.filter((a) => a.status === "completed").length;

                          return (
                            <div key={dateKey} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-display text-base font-semibold text-ink">
                                    {dateLabel(dateKey)}
                                  </span>
                                  <span className="text-xs text-muted tabular-nums lining-nums">({dateKey})</span>
                                </div>
                                <p className="mt-0.5 text-xs sm:text-sm text-muted tabular-nums lining-nums">
                                  {dayApts.length} patient{dayApts.length === 1 ? "" : "s"} · {completed} completed
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => downloadCsv(dateKey)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-brand-line bg-brand-tint/75 px-3.5 text-xs sm:text-sm font-semibold text-ink hover:bg-brand-tint transition-colors cursor-pointer"
                              >
                                <DownloadIcon className="size-4" />
                                <span>Download CSV</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================================================================= */}
              {/* TAB 5: PATIENT SEARCH (MATCHES DOCTOR DIRECTORY SEARCH BAR)       */}
              {/* ================================================================= */}
              {activeTab === "search" && (
                <div className="fade-in flex flex-col gap-5">
                  <div className="card rounded-3xl p-6">
                    <label htmlFor="search-input" className="font-display text-xl font-medium tracking-tight text-ink block">
                      Find patient by name, village, phone, or token
                    </label>
                    <p className="mt-1 text-sm text-muted">
                      Search across all registered appointments and walk-in records stored on this device.
                    </p>

                    <div className="mt-4 card flex items-center gap-3 rounded-2xl px-4 focus-within:outline-3 focus-within:outline-ink">
                      <SearchIcon className="size-5 shrink-0 text-brand" />
                      <input
                        id="search-input"
                        type="search"
                        placeholder="e.g. Ghulam Mohammad, Tarzoo, Dangerpora, 97977… or EP-"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoComplete="off"
                        className="min-h-13 min-w-0 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
                      />
                    </div>
                  </div>

                  {searchQuery.trim() !== "" &&
                    (searchMatches.length === 0 ? (
                      <p className="card rounded-2xl p-6 text-base text-muted">
                        No patient records match &ldquo;{searchQuery.trim()}&rdquo;.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-3">
                        {searchMatches.map((a) => (
                          <li
                            key={a.token}
                            className="card rounded-2xl sm:rounded-3xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-lg bg-brand px-2.5 py-0.5 font-display text-xs font-semibold text-mint tabular-nums lining-nums">
                                  {a.token}
                                </span>
                                <span className="font-display text-lg font-medium text-ink">{a.patientName}</span>
                                {a.patientAddress && (
                                  <span className="inline-flex items-center gap-1 rounded-md border border-brand-line bg-brand-tint/75 px-2.5 py-0.5 text-xs font-semibold text-ink">
                                    <MapPinIcon className="size-3 shrink-0" />
                                    <span>{a.patientAddress}</span>
                                  </span>
                                )}
                                <span className="text-xs text-muted tabular-nums lining-nums">
                                  +91 {a.patientPhone}
                                </span>
                              </div>
                              <p className="mt-1.5 text-sm text-muted">
                                {a.doctorName} ({a.speciality}) · {dateLabel(a.date)} at {formatTime(a.time)} ·{" "}
                                <strong className="font-semibold text-ink capitalize">
                                  {a.status.replace("_", " ")}
                                </strong>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`tel:+91${a.patientPhone}`}
                                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                              >
                                <PhoneIcon className="size-4" />
                                <span>Call</span>
                              </a>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* WALK-IN PATIENT ENTRY MODAL                                             */}
      {/* ======================================================================= */}
      {showWalkInModal && (
        <div className="no-print fade-in fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="walkin-modal-title"
            className="sheet-in card flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                  <UserIcon className="size-5" />
                </span>
                <div>
                  <h2 id="walkin-modal-title" className="font-display text-xl font-semibold tracking-tight text-ink">
                    Register walk-in patient
                  </h2>
                  <p className="text-xs sm:text-sm text-muted">
                    Reserves the consultation slot immediately on this device.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                aria-label="Close modal"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ground text-charcoal hover:bg-sand cursor-pointer"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            {walkInError && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-emergency">
                {walkInError}
              </p>
            )}

            <div className="flex flex-col gap-4">
              {/* Doctor */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-doc" className={fieldLabel}>
                  Consultant Specialist
                </label>
                <select
                  id="walkin-doc"
                  value={walkInDocId}
                  onChange={(e) => {
                    setWalkInDocId(e.target.value);
                    setWalkInTime("");
                  }}
                  className={fieldInput}
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
                  <span className={fieldLabel}>Available Slot ({dateLabel(selectedDate)})</span>
                  {(() => {
                    const doc = allDoctors.find((d) => d.id === walkInDocId);
                    if (!doc) return null;
                    const slots = timeSlots(doc, selectedDate, now);
                    const taken = getBookedSlots(doc.id, selectedDate);

                    if (slots.length === 0) {
                      return (
                        <p className="rounded-xl border border-line bg-ground p-3.5 text-sm text-muted">
                          No scheduled OPD slots remain for {doc.name ?? doc.speciality} on {dateLabel(selectedDate)}. Pick another OPD date first.
                        </p>
                      );
                    }

                    return (
                      <div className="grid max-h-44 grid-cols-3 gap-2 overflow-y-auto rounded-2xl border border-line bg-ground p-2">
                        {slots.map((s) => {
                          const isOccupied = taken.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={isOccupied}
                              onClick={() => setWalkInTime(s)}
                              className={`min-h-10 rounded-xl border text-xs sm:text-sm font-semibold tabular-nums lining-nums transition-colors ${
                                isOccupied
                                  ? "cursor-not-allowed border-line bg-sand text-muted/60 line-through"
                                  : walkInTime === s
                                  ? "border-brand bg-brand text-white cursor-pointer"
                                  : "border-line-strong bg-white text-ink hover:border-brand cursor-pointer"
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
                <label htmlFor="walkin-name" className={fieldLabel}>
                  Patient Full Name
                </label>
                <input
                  id="walkin-name"
                  type="text"
                  placeholder="e.g. Ghulam Mohammad"
                  value={walkInName}
                  onChange={(e) => setWalkInName(e.target.value)}
                  className={fieldInput}
                />
              </div>

              {/* Patient Village / Address */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="walkin-address" className={fieldLabel}>
                    Village / Town / Area
                  </label>
                  <span className="text-xs font-medium text-muted">Helps distinguish similar names</span>
                </div>
                <input
                  id="walkin-address"
                  type="text"
                  placeholder="e.g. Tarzoo, Dangerpora, Sangrama, Sopore"
                  value={walkInAddress}
                  onChange={(e) => setWalkInAddress(e.target.value)}
                  className={fieldInput}
                />
              </div>

              {/* Patient Phone */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="walkin-phone" className={fieldLabel}>
                  Mobile Number (10 Digits)
                </label>
                <div className="flex overflow-hidden rounded-xl border border-line-strong bg-white focus-within:border-brand">
                  <span className="flex items-center border-r border-line bg-ground px-3.5 text-sm font-semibold text-charcoal tabular-nums lining-nums">
                    +91
                  </span>
                  <input
                    id="walkin-phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="10-digit mobile number"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    className="min-h-12 flex-1 bg-transparent px-3.5 text-base text-ink outline-none placeholder:text-muted/70"
                  />
                </div>
                {staff && (
                  <WalkInPatientHint
                    phone={walkInPhone}
                    name={walkInName}
                    onPick={(p) => {
                      setWalkInName(p.name);
                      if (p.area && !walkInAddress) setWalkInAddress(p.area);
                    }}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setShowWalkInModal(false)}
                className="min-h-12 flex-1 rounded-xl border border-line-strong bg-white font-semibold text-charcoal hover:bg-ground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWalkIn}
                className="min-h-12 flex-1 rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
              >
                Issue Token Slip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* WALK-IN SUCCESS TOKEN SLIP MODAL                                        */}
      {/* ======================================================================= */}
      {walkInSuccessSlip && (
        <div className="no-print fade-in fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-slip-title"
            className="sheet-in card flex w-full max-w-md flex-col gap-5 rounded-3xl border-brand-line p-6 sm:p-8 text-center"
          >
            <span className="mx-auto flex size-13 items-center justify-center rounded-2xl bg-brand-tint text-ink ring-1 ring-brand-line">
              <CheckIcon className="size-6" />
            </span>

            <div>
              <span className="inline-block rounded-md border border-brand-line bg-brand-tint px-3 py-0.5 text-xs font-bold uppercase tracking-wider text-ink">
                Official Token Issued
              </span>
              <h2
                id="token-slip-title"
                className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink tabular-nums lining-nums"
              >
                {walkInSuccessSlip.token}
              </h2>
            </div>

            <dl className="rounded-2xl border border-line bg-ground p-4 text-left text-sm space-y-2 text-charcoal">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Patient</dt>
                <dd className="font-semibold text-ink text-right">{walkInSuccessSlip.patientName}</dd>
              </div>
              {walkInSuccessSlip.patientAddress && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Area / Village</dt>
                  <dd className="font-semibold text-ink text-right">{walkInSuccessSlip.patientAddress}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Doctor</dt>
                <dd className="font-semibold text-ink text-right">{walkInSuccessSlip.doctorName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Slot</dt>
                <dd className="font-semibold text-ink tabular-nums lining-nums">
                  {formatTime(walkInSuccessSlip.time)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Date</dt>
                <dd className="font-semibold text-ink">{dateLabel(walkInSuccessSlip.date)}</dd>
              </div>
            </dl>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
              >
                <PrinterIcon className="size-4" />
                <span>Print Slip</span>
              </button>
              <button
                type="button"
                onClick={() => setWalkInSuccessSlip(null)}
                className="min-h-12 flex-1 rounded-xl border border-line-strong bg-white text-sm font-semibold text-ink hover:bg-ground transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* REGISTER NEW SPECIALIST MODAL                                           */}
      {/* ======================================================================= */}
      {showNewDocModal && (
        <div className="no-print fade-in fixed inset-0 z-50 flex items-center justify-center bg-night/60 p-4 backdrop-blur-xs">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-doc-title"
            className="sheet-in card flex w-full max-w-lg flex-col gap-5 rounded-3xl p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-ink ring-1 ring-brand-line/70">
                  <StethoscopeIcon className="size-5" />
                </span>
                <div>
                  <h2 id="new-doc-title" className="font-display text-xl font-semibold tracking-tight text-ink">
                    Add visiting specialist
                  </h2>
                  <p className="text-xs sm:text-sm text-muted">
                    Register specialist credentials and weekly OPD hours.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                aria-label="Close modal"
                className="flex size-9 shrink-0 items-center justify-center rounded-md bg-ground text-charcoal hover:bg-sand cursor-pointer"
              >
                <CloseIcon className="size-4" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-doc-name" className={fieldLabel}>
                  Doctor Full Name
                </label>
                <input
                  id="new-doc-name"
                  type="text"
                  placeholder="e.g. Dr. Shabir Ahmad"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className={fieldInput}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-doc-spec" className={fieldLabel}>
                  Speciality
                </label>
                <input
                  id="new-doc-spec"
                  type="text"
                  placeholder="e.g. Orthopedics & Joint Replacement"
                  value={newDocSpec}
                  onChange={(e) => setNewDocSpec(e.target.value)}
                  className={fieldInput}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="new-doc-degree" className={fieldLabel}>
                  Degree &amp; Credentials
                </label>
                <input
                  id="new-doc-degree"
                  type="text"
                  placeholder="e.g. MBBS, MS Ortho"
                  value={newDocDegree}
                  onChange={(e) => setNewDocDegree(e.target.value)}
                  className={fieldInput}
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-doc-day" className={fieldLabel}>
                    OPD Day
                  </label>
                  <select
                    id="new-doc-day"
                    value={newDocDay}
                    onChange={(e) => setNewDocDay(Number(e.target.value))}
                    className="min-h-12 rounded-xl border border-line-strong bg-white px-2.5 text-sm font-semibold text-ink outline-none focus:border-brand"
                  >
                    {DAY_NAMES.map((name, i) => (
                      <option key={i} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-doc-start" className={fieldLabel}>
                    Start
                  </label>
                  <input
                    id="new-doc-start"
                    type="time"
                    value={newDocStart}
                    onChange={(e) => setNewDocStart(e.target.value)}
                    className="min-h-12 rounded-xl border border-line-strong bg-white px-2.5 text-sm font-semibold text-ink tabular-nums lining-nums outline-none focus:border-brand"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="new-doc-end" className={fieldLabel}>
                    End
                  </label>
                  <input
                    id="new-doc-end"
                    type="time"
                    value={newDocEnd}
                    onChange={(e) => setNewDocEnd(e.target.value)}
                    className="min-h-12 rounded-xl border border-line-strong bg-white px-2.5 text-sm font-semibold text-ink tabular-nums lining-nums outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setShowNewDocModal(false)}
                className="min-h-12 flex-1 rounded-xl border border-line-strong bg-white font-semibold text-charcoal hover:bg-ground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewDoctor}
                className="min-h-12 flex-1 rounded-xl bg-brand font-semibold text-white hover:bg-brand-dark transition-colors cursor-pointer"
              >
                Save Specialist
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* DEDICATED PRINT LAYOUT: TOKEN SLIP OR DAILY OPD REGISTER SHEET          */}
      {/* ======================================================================= */}
      <div className="print-only hidden text-black">
        {posterPrint ? (
          <CounterQrPoster />
        ) : walkInSuccessSlip ? (
          <div className="appointment-slip text-left">
            <div className="border-b-2 border-black pb-3 mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">Official OPD Token Slip</p>
                <h2 className="text-2xl font-bold mt-0.5">{clinic.name}</h2>
                <p className="text-xs mt-0.5">
                  {clinic.address} · Helpline: {clinic.phoneDisplay}
                </p>
              </div>
              <div className="text-right tabular-nums lining-nums">
                <span className="text-xs uppercase font-bold block">Token No</span>
                <span className="text-2xl font-bold">{walkInSuccessSlip.token}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <p>
                <strong>Patient Name:</strong> {walkInSuccessSlip.patientName}
              </p>
              <p>
                <strong>Mobile:</strong> +91 {walkInSuccessSlip.patientPhone}
              </p>
              <p>
                <strong>Area / Village:</strong> {walkInSuccessSlip.patientAddress || "—"}
              </p>
              <p>
                <strong>Date:</strong> {dateLabel(walkInSuccessSlip.date)} ({walkInSuccessSlip.date})
              </p>
              <p>
                <strong>Consultant:</strong> {walkInSuccessSlip.doctorName}
              </p>
              <p>
                <strong>Slot Time:</strong> {formatTime(walkInSuccessSlip.time)}
              </p>
              <p className="col-span-2">
                <strong>Speciality:</strong> {walkInSuccessSlip.speciality}
              </p>
            </div>
            <p className="mt-4 pt-3 border-t border-black/30 text-xs">
              Please present this slip at the reception desk 10–15 minutes before your scheduled slot.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <div className="border-b-2 border-black pb-3 mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{clinic.name} — Daily OPD Register</h2>
                <p className="text-xs mt-0.5">
                  {clinic.address} · Reception: {clinic.phoneDisplay}
                </p>
              </div>
              <div className="text-right text-xs">
                <p>
                  <strong>OPD Date:</strong> {dateLabel(selectedDate)} ({selectedDate})
                </p>
                <p>
                  <strong>Doctor:</strong>{" "}
                  {currentDoctorObj
                    ? `${currentDoctorObj.name ?? currentDoctorObj.speciality} (${currentDoctorObj.speciality})`
                    : "All Visiting Specialists"}
                </p>
                <p>
                  <strong>Summary:</strong> {filteredAppointments.length} Total · {countCompleted} Done ·{" "}
                  {countWaiting} Waiting · {countCancelled} Cancelled
                </p>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <p className="text-sm py-8 text-center">No patients scheduled for this date / filter.</p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-black text-left">
                    <th className="py-2 pr-2 font-bold">Token</th>
                    <th className="py-2 pr-2 font-bold">Time</th>
                    <th className="py-2 pr-2 font-bold">Patient Name</th>
                    <th className="py-2 pr-2 font-bold">Village / Area</th>
                    <th className="py-2 pr-2 font-bold">Mobile</th>
                    <th className="py-2 pr-2 font-bold">Doctor</th>
                    <th className="py-2 pr-2 font-bold">Type</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.token} className="border-b border-black/25">
                      <td className="py-2 pr-2 font-bold tabular-nums lining-nums">{apt.token}</td>
                      <td className="py-2 pr-2 tabular-nums lining-nums">{formatTime(apt.time)}</td>
                      <td className="py-2 pr-2 font-semibold">{apt.patientName}</td>
                      <td className="py-2 pr-2">{apt.patientAddress || "—"}</td>
                      <td className="py-2 pr-2 tabular-nums lining-nums">{apt.patientPhone}</td>
                      <td className="py-2 pr-2">{apt.doctorName}</td>
                      <td className="py-2 pr-2 uppercase">{apt.type === "walk_in" ? "Walk-In" : "Online"}</td>
                      <td className="py-2 uppercase">{apt.status.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
