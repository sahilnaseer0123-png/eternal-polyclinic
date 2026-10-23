"use client";

// Header on every page (design C). Wide screens: pill menu, Call and Book.
// Phones and tablets: logo and a round Call button; the menu lives in the bottom tab bar (TabBar.tsx).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";
import { Logo } from "./Logo";

export const NAV = [
  { href: "/doctors", label: "Doctors" },
  { href: "/services", label: "Services" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const current = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 sm:py-3">
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

        <nav aria-label="Main" className="hidden items-center gap-1 text-base font-semibold lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current(item.href)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 ${
                pathname === item.href ? "bg-brand-tint text-brand" : "hover:bg-ground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={`tel:${clinic.phone}`}
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-tint px-4 text-brand hover:bg-brand-line/40"
          >
            <PhoneIcon className="size-4" />
            {clinic.phoneDisplay}
          </a>
          <Link
            href="/book"
            aria-current={current("/book")}
            className="ml-1 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-white hover:bg-slate-800"
          >
            Book
          </Link>
        </nav>

        <a
          href={`tel:${clinic.phone}`}
          aria-label={`Call the clinic, ${clinic.phoneDisplay}`}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand lg:hidden"
        >
          <PhoneIcon />
        </a>
      </div>
    </header>
  );
}
