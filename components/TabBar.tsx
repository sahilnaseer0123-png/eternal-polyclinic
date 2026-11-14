"use client";

// Bottom tab bar on phones and tablets (design C): Home, Doctors, Book, More.
// "More" opens a small sheet with the other pages, WhatsApp and Call.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { clinic } from "@/data/clinic";
import { CalendarIcon, ChatIcon, ChevronRightIcon, CloseIcon, HomeIcon, MenuIcon, PhoneIcon, UserIcon } from "./Icons";
import { NAV } from "./nav";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/doctors", label: "Doctors", Icon: UserIcon },
  { href: "/book", label: "Book", Icon: CalendarIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive =
    NAV.some((n) => n.href === pathname && n.href !== "/doctors") ||
    pathname === "/privacy";
  const tabClass = (on: boolean) =>
    `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${on ? "text-ink" : "text-muted"}`;

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
            className="fade-in fixed inset-0 z-40 bg-ink/40 backdrop-blur-xs"
          />
          <nav
            id="more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="More navigation"
            className="sheet-in fixed inset-x-3 bottom-[4.75rem] z-50 rounded-2xl bg-white p-3 shadow-elevated border border-line"
          >
            <ul className="space-y-1">
              {[...NAV.filter((n) => n.href !== "/doctors"), { href: "/privacy", label: "Privacy notice" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`flex min-h-11 items-center justify-between rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                      pathname === item.href ? "bg-brand-tint text-brand" : "text-charcoal hover:bg-ground hover:text-ink"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRightIcon className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sand text-ink border border-line text-sm font-bold hover:bg-stone transition-colors"
              >
                <ChatIcon className="size-4 text-ink" /> WhatsApp
              </a>
              <a
                href={`tel:${clinic.phone}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand text-sm font-bold text-white hover:bg-brand-dark"
              >
                <PhoneIcon className="size-3.5" /> Call
              </a>
            </div>
          </nav>
        </>
      )}

      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 [view-transition-name:tab-bar] border-t border-line bg-white/95 backdrop-blur-md px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1"
      >
        {TABS.map(({ href, label, Icon }) => {
          const on = pathname === href || (href !== "/" && Boolean(pathname?.startsWith(href)));
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={tabClass(on)}>
              <span className={`inline-flex items-center justify-center rounded-md px-3 py-0.5 transition-colors ${on ? "bg-brand-tint text-ink" : ""}`}>
                <Icon className="size-5.5" />
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
          <span className={`inline-flex items-center justify-center rounded-md px-3 py-0.5 transition-colors ${open || moreActive ? "bg-brand-tint text-ink" : ""}`}>
            {open ? <CloseIcon className="size-5.5" /> : <MenuIcon className="size-5.5" />}
          </span>
          More
        </button>
      </nav>
    </div>
  );
}
