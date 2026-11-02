"use client";

// Header on every page (design C). Wide screens: pill menu, Call and Book.
// Phones and tablets: logo and a round Call button; the menu lives in the bottom tab bar (TabBar.tsx).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";
import { Logo } from "./Logo";
import { NAV } from "./nav";

export function SiteHeader() {
  const pathname = usePathname();
  const current = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <header className="sticky top-0 z-30 [view-transition-name:site-header] border-b border-line/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3 text-ink group">
          <Logo className="size-9 shrink-0 text-brand" />
          <span className="leading-tight">
            <span className="block font-bold tracking-tight text-ink font-display text-base sm:text-lg group-hover:text-brand transition-colors">
              {clinic.name}
            </span>
            <span className="block text-xs text-muted font-medium">
              <span className="sm:hidden">Sopore, Kashmir</span>
              <span className="hidden sm:inline">Opposite SDH Hospital, Sopore</span>
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1.5 text-sm font-medium lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current(item.href)}
              className={`inline-flex min-h-10 items-center rounded-lg px-3.5 transition-colors ${
                pathname === item.href
                  ? "bg-brand-tint text-brand font-semibold"
                  : "text-charcoal hover:text-ink hover:bg-ground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            aria-current={current("/admin")}
            className={`inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold uppercase tracking-wider text-muted transition-colors hover:text-ink ${
              pathname === "/admin" ? "bg-ground text-ink" : ""
            }`}
          >
            Staff
          </Link>
          <a
            href={`tel:${clinic.phone}`}
            className="ml-2 inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand-line hover:bg-brand-tint"
          >
            <PhoneIcon className="size-3.5 shrink-0 text-brand" />
            <span>{clinic.phoneDisplay}</span>
          </a>
          <Link
            href="/book"
            aria-current={current("/book")}
            className="ml-1 inline-flex min-h-10 shrink-0 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-2xs transition-all hover:bg-brand-dark"
          >
            Book Appointment
          </Link>
        </nav>

        <a
          href={`tel:${clinic.phone}`}
          aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink lg:hidden shadow-2xs"
        >
          <PhoneIcon className="size-4 text-brand" />
        </a>
      </div>
    </header>
  );
}
