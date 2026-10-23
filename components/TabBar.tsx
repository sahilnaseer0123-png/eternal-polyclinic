"use client";

// Bottom tab bar on phones and tablets (design C): Home, Doctors, Book, More.
// "More" opens a small sheet with the other pages, WhatsApp and Call.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clinic } from "@/data/clinic";
import { CalendarIcon, ChatIcon, ChevronRightIcon, CloseIcon, HomeIcon, MenuIcon, PhoneIcon, UserIcon } from "./Icons";
import { NAV } from "./SiteHeader";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/doctors", label: "Doctors", Icon: UserIcon },
  { href: "/book", label: "Book", Icon: CalendarIcon },
] as const;

export function TabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = NAV.some((n) => n.href === pathname && n.href !== "/doctors") || pathname === "/privacy";
  const tabClass = (on: boolean) =>
    `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${on ? "text-brand" : "text-muted"}`;

  return (
    <div className="lg:hidden" onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fade-in fixed inset-0 z-40 bg-ink/30"
          />
          <nav
            id="more-menu"
            aria-label="More"
            className="sheet-in fixed inset-x-3 bottom-[4.75rem] z-50 rounded-3xl bg-white p-2 shadow-xl"
          >
            <ul>
              {[...NAV.filter((n) => n.href !== "/doctors"), { href: "/privacy", label: "Privacy notice" }].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-between rounded-2xl px-4 font-semibold ${
                      pathname === item.href ? "bg-brand-tint text-brand" : "hover:bg-ground"
                    }`}
                  >
                    {item.label}
                    <ChevronRightIcon className="size-5 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-2">
              <a
                href={`https://wa.me/${clinic.whatsapp}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-ground font-semibold"
              >
                <ChatIcon /> WhatsApp
              </a>
              <a
                href={`tel:${clinic.phone}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand font-semibold text-white"
              >
                <PhoneIcon /> Call
              </a>
            </div>
          </nav>
        </>
      )}

      <nav
        aria-label="Quick links"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-4 border-t border-line bg-white px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1"
      >
        {TABS.map(({ href, label, Icon }) => {
          const on = pathname === href;
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined} className={tabClass(on)}>
              <Icon className="size-6" />
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
          {open ? <CloseIcon /> : <MenuIcon />}
          More
        </button>
      </nav>
    </div>
  );
}
