"use client";

// Header on every page (design v3): night bar. Wide screens: menu, Call and Book.
// Phones and tablets: logo, Call and Book; the menu lives in the bottom tab bar (TabBar.tsx).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";
import { Logo } from "./Logo";
import { NAV } from "./nav";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 [view-transition-name:site-header] border-b border-night-line bg-night text-ground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2.5 sm:px-6">
        <Link href="/" className="group flex min-h-11 items-center gap-3">
          <Logo className="size-10 shrink-0" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-medium tracking-tight group-hover:text-mint">
              {clinic.name}
            </span>
            <span className="block text-xs font-medium text-night-muted">
              <span className="sm:hidden">Sopore, Kashmir</span>
              <span className="hidden sm:inline">Opposite SDH Hospital, Sopore</span>
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-[0.9375rem] font-semibold lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-xl px-3.5 hover:text-mint ${
                pathname === item.href ? "text-mint" : "text-night-muted"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-night-muted hover:text-mint"
          >
            Staff
          </Link>
          <a
            href={`tel:${clinic.phone}`}
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-night-line px-4 hover:border-mint"
          >
            <PhoneIcon className="size-4 text-mint" />
            {clinic.phoneDisplay}
          </a>
          <Link
            href="/book"
            className="ml-1 inline-flex min-h-11 items-center rounded-xl bg-mint px-5 font-bold text-night hover:bg-white"
          >
            Book a visit
          </Link>
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <a
            href={`tel:${clinic.phone}`}
            aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-night-line"
          >
            <PhoneIcon className="size-4 text-mint" />
          </a>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-xl bg-mint px-4 text-sm font-bold text-night"
          >
            Book
          </Link>
        </div>
      </div>
    </header>
  );
}
