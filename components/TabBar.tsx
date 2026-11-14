"use client";

// Bottom tab bar on phones and tablets (design C): Home, Doctors, Book, More.
// "More" opens a small sheet with the other pages, WhatsApp and Call.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clinic } from "@/data/clinic";
import {
  CalendarIcon,
  ChatIcon,
  CloseIcon,
  HomeIcon,
  MapPinIcon,
  MenuIcon,
  PhoneIcon,
  StethoscopeIcon,
  UserIcon,
} from "./Icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/doctors", label: "Doctors", Icon: UserIcon },
  { href: "/#days", label: "OPD Days", Icon: CalendarIcon },
  { href: "/services", label: "Services", Icon: StethoscopeIcon },
] as const;

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/doctors", label: "Doctors & OPD" },
  { href: "/services", label: "Tests & Scans" },
  { href: "/report", label: "Lab Report" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Visit & Map" },
  { href: "/privacy", label: "Privacy notice" },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive =
    pathname === "/faq" ||
    pathname === "/contact" ||
    pathname === "/report" ||
    pathname === "/privacy";
  const tabClass = (on: boolean) =>
    `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] min-[380px]:text-xs font-semibold ${on ? "text-ink" : "text-muted"}`;

  // Prevent background scroll bleed when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fade-in fixed inset-0 z-40 bg-ink/45"
          />
          <nav
            id="more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Clinic navigation"
            className="sheet-in fixed inset-x-3 bottom-[4.75rem] z-50 rounded-2xl bg-white p-3.5 shadow-elevated border border-line"
          >
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              Quick Clinic Navigation
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {MENU_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${
                      pathname === item.href
                        ? "bg-brand-tint text-accent ring-1 ring-brand-line/70"
                        : "bg-ground/60 text-charcoal hover:bg-ground hover:text-ink"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                Direct Clinic Desks
              </p>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://wa.me/${clinic.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-sand text-ink border border-line text-xs min-[380px]:text-sm font-bold hover:bg-stone transition-colors"
                >
                  <ChatIcon className="size-4 shrink-0 text-ink" /> WhatsApp
                </a>
                <a
                  href={`tel:${clinic.phone}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-brand text-xs min-[380px]:text-sm font-bold text-white hover:bg-brand-dark"
                >
                  <PhoneIcon className="size-3.5 shrink-0" /> Call
                </a>
                <a
                  href={clinic.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-line-strong bg-white text-xs min-[380px]:text-sm font-bold text-ink hover:border-brand"
                >
                  <MapPinIcon className="size-3.5 shrink-0 text-accent" /> Map
                </a>
              </div>
            </div>
          </nav>
        </>
      )}

      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 [view-transition-name:tab-bar] border-t border-line bg-white px-1 min-[380px]:px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1"
      >
        {TABS.map(({ href, label, Icon }) => {
          const on = pathname === href || (href !== "/" && Boolean(pathname?.startsWith(href)));
          const pillCls = on
            ? "bg-brand text-white"
            : href === "/#days"
              ? "bg-brand-tint text-accent ring-1 ring-brand-line/70"
              : "";
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={tabClass(on)}>
              <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 transition-colors ${pillCls}`}>
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          );
        })}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="more-menu"
          onClick={() => setOpen((o) => !o)}
          className={tabClass(open || moreActive)}
        >
          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 transition-colors ${open || moreActive ? "bg-brand text-white" : ""}`}>
            {open ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
          </span>
          Menu
        </button>
      </nav>
    </div>
  );
}
