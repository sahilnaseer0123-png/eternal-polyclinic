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
    <header className="sticky top-0 z-30 [view-transition-name:site-header] border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 sm:px-5 sm:py-3">
        <Link href="/" className="flex min-h-11 items-center gap-3 text-ink">
          <Logo className="size-10 shrink-0 sm:size-12" />
          <span className="leading-tight">
            <span className="block font-extrabold tracking-tight">{clinic.name}</span>
            {/* Phones: just the town, so the header stays one line. Wider screens: the full address. */}
            <span className="block text-sm text-muted">
              <span className="sm:hidden">{clinic.address.split(", ").pop()}</span>
              <span className="hidden sm:inline">{clinic.address}</span>
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold xl:gap-1.5 xl:text-base lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current(item.href)}
              className={`inline-flex min-h-11 items-center rounded-full px-3 xl:px-4 ${
                pathname === item.href ? "bg-brand-tint text-brand" : "hover:bg-ground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={`tel:${clinic.phone}`}
            className="ml-2 inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-brand-line/50 bg-brand-tint px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand-line/40"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <PhoneIcon className="size-4 shrink-0" />
            <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
          </a>
          <Link
            href="/book"
            aria-current={current("/book")}
            className="ml-1.5 inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-brand px-5 font-bold text-white shadow-sm transition-all hover:bg-brand-dark hover:shadow"
          >
            Book Appointment
          </Link>
        </nav>

        <a
          href={`tel:${clinic.phone}`}
          aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
          className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-brand-line/50 bg-brand-tint text-brand lg:hidden"
        >
          <span className="absolute right-2 top-2 flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <PhoneIcon />
        </a>
      </div>
    </header>
  );
}
