"use client";

// Header on every page (design v3): light bar, one dark-teal primary button. Wide screens: menu, Staff, Call and Book.
// Phones and tablets: logo, Call and Book; the menu lives in the bottom tab bar (TabBar.tsx).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";
import { Logo } from "./Logo";
import { NAV } from "./nav";

export function SiteHeader() {
  const pathname = usePathname();

  const isHome = pathname === "/";

  return (
    <header
      className={`sticky top-0 z-30 [view-transition-name:site-header] border-b text-ink backdrop-blur-md ${
        isHome ? "border-[#ECEFEA] bg-white/95" : "border-line bg-ground/95"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 sm:gap-4 px-4 py-2.5 sm:px-6">
        <Link href="/" className="group flex min-h-11 items-center gap-2.5 sm:gap-3 min-w-0">
          <Logo className="size-10 shrink-0" />
          <span className="leading-tight">
            <span className="block font-display text-lg font-medium tracking-tight group-hover:text-brand">
              {clinic.name}
            </span>
            <span className="block text-xs font-medium text-muted">
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
              className={`inline-flex min-h-11 items-center rounded-xl px-3.5 hover:text-brand ${
                pathname === item.href ? "text-brand" : "text-charcoal"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-muted hover:text-brand"
          >
            Staff
          </Link>
          <a
            href={`tel:${clinic.phone}`}
            aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl border-[1.5px] border-ink px-3 xl:px-4 hover:bg-ink hover:text-white whitespace-nowrap shrink-0"
          >
            <PhoneIcon className="size-4 shrink-0" />
            <span className="hidden xl:inline">{clinic.phoneDisplay}</span>
          </a>
          <Link
            href="/book"
            className="ml-1 inline-flex min-h-11 items-center rounded-xl bg-brand px-4 xl:px-5 font-bold text-white hover:bg-brand-dark whitespace-nowrap shrink-0"
          >
            Book a visit
          </Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0 lg:hidden">
          <a
            href={`tel:${clinic.phone}`}
            aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-ink"
          >
            <PhoneIcon className="size-4" />
          </a>
          <Link
            href="/book"
            className="inline-flex min-h-11 items-center rounded-xl bg-brand px-3 sm:px-3.5 text-sm font-bold text-white whitespace-nowrap shrink-0"
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book a visit</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
