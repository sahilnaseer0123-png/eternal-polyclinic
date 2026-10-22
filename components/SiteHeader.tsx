"use client";

// Header on every page: logo, menu (collapses to a "Menu" button on phones), call button.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";

export const NAV = [
  { href: "/doctors", label: "Doctors" },
  { href: "/services", label: "Services" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const linkClass = (href: string) =>
    `rounded-lg px-3 py-2 hover:text-brand ${pathname === href ? "font-semibold text-brand" : ""}`;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
        <Link href="/" className="flex items-center gap-3 text-ink" onClick={() => setOpen(false)}>
          <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
            E
          </span>
          <span className="leading-tight">
            <span className="block font-bold">{clinic.name}</span>
            <span className="block text-sm text-muted">{clinic.address}</span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 text-base font-medium lg:flex">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)} aria-current={pathname === item.href ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
          <Link
            href="/book"
            aria-current={pathname === "/book" ? "page" : undefined}
            className="ml-3 inline-flex min-h-11 items-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-dark"
          >
            Book
          </Link>
          <a
            href={`tel:${clinic.phone}`}
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 font-semibold hover:border-brand"
          >
            <PhoneIcon className="size-4" />
            {clinic.phoneDisplay}
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-semibold lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Main" className="border-t border-line bg-white px-5 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {[{ href: "/", label: "Home" }, ...NAV, { href: "/book", label: "Book an appointment" }].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`flex min-h-12 items-center border-b border-line text-lg ${pathname === item.href ? "font-semibold text-brand" : ""}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
