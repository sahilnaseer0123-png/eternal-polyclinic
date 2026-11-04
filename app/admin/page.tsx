"use client";

// /admin: the clinic dashboard. Decides what to show from the sign-in state:
//   staff accounts exist → username/password sign-in, then a role-aware dashboard
//     owner / reception → full dashboard (ReceptionDesk with staff sections)
//     lab               → Lab Reports + WhatsApp log + My Account only
//   no staff accounts yet → the original shared-PIN reception desk, with a card for the
//     owner to create the first account (which switches the PIN off)
//   `next dev` / offline   → the original desk in local mode

import { useCallback, useEffect, useState } from "react";
import { ReceptionDesk } from "@/components/admin/ReceptionDesk";
import { LabReportsPanel } from "@/components/admin/LabReportsPanel";
import { NotificationsPanel } from "@/components/admin/NotificationsPanel";
import { StaffLogin, StaffPanel } from "@/components/admin/StaffPanel";
import { LockIcon, ReportIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/Icons";
import { ROLE_LABEL, api, fetchAuthInfo, type AuthInfo, type StaffSession } from "@/lib/staff-api";

export default function AdminPage() {
  const [auth, setAuth] = useState<AuthInfo | null>(null);
  const refresh = useCallback(() => {
    fetchAuthInfo().then(setAuth);
  }, []);

  useEffect(() => {
    refresh();
    const onSignedOut = () => refresh();
    window.addEventListener("ep:staff_signed_out", onSignedOut);
    return () => window.removeEventListener("ep:staff_signed_out", onSignedOut);
  }, [refresh]);

  if (!auth) {
    return (
      <section className="bg-ground">
        <div className="mx-auto max-w-6xl px-5 py-16 text-muted" aria-live="polite">
          Loading the dashboard…
        </div>
      </section>
    );
  }

  if (auth.staffMode === "accounts") {
    if (!auth.staff) return <StaffLogin onSignedIn={refresh} />;
    if (auth.staff.role === "lab") return <LabConsole staff={auth.staff} />;
    return <ReceptionDesk key={auth.staff.id} staff={auth.staff} />;
  }

  return <ReceptionDesk setupMode={auth.staffMode === "setup"} databaseMissing={auth.staffMode === "pin_only"} />;
}

function LabConsole({ staff }: { staff: StaffSession }) {
  const [tab, setTab] = useState<"labs" | "notify" | "account">("labs");
  const tabs = [
    { id: "labs" as const, label: "Lab Reports", Icon: ReportIcon },
    { id: "notify" as const, label: "WhatsApp", Icon: WhatsAppIcon },
    { id: "account" as const, label: "My Account", Icon: ShieldCheckIcon },
  ];
  return (
    <>
      <section className="bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-5 pt-6 pb-6 sm:px-6 sm:pt-8">
          <div>
            <p className="eyebrow text-muted">Lab desk</p>
            <h1 className="mt-2 text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
              Lab{" "}
              <em className="inline-block rounded-xl bg-brand-tint px-2.5 py-0.5 text-ink ring-1 ring-brand-line/70">reports</em>
            </h1>
            <p className="mt-2 text-sm font-semibold text-charcoal">
              Signed in as {staff.displayName} · {ROLE_LABEL[staff.role]}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await api("/api/admin/auth", { method: "POST", json: { action: "logout" } }).catch(() => undefined);
              window.location.reload();
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-ink bg-white px-4 text-sm sm:text-base font-semibold text-ink hover:bg-ink hover:text-white transition-colors cursor-pointer"
          >
            <LockIcon className="size-4" />
            Sign out
          </button>
        </div>
      </section>
      <section className="rounded-t-[2rem] sm:rounded-t-[2.75rem] border-t border-line/80 bg-ground">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-16">
          <nav aria-label="Lab sections" className="flex gap-2 overflow-x-auto pb-1">
            {tabs.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm sm:text-base font-semibold transition-colors cursor-pointer ${
                  tab === id ? "bg-ink text-white" : "card text-charcoal hover:border-line-strong hover:text-ink"
                }`}
              >
                <Icon className="size-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>
          {tab === "labs" && <LabReportsPanel session={staff} />}
          {tab === "notify" && <NotificationsPanel session={staff} />}
          {tab === "account" && <StaffPanel session={staff} />}
        </div>
      </section>
    </>
  );
}
