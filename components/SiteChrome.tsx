// Footer and quick-action buttons shared by every page (see app/layout.tsx).

import Link from "next/link";
import { clinic } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";
import { ChatIcon } from "./Icons";
import { Logo } from "./Logo";
import { NAV } from "./nav";
import { TabBar } from "./TabBar";

export function SiteFooter() {
  const hours = `${formatTime(clinic.hours.open)} – ${formatTime(clinic.hours.close)}`;
  const label =
    "mb-2 text-xs font-bold uppercase tracking-wider text-muted";
  const link =
    "inline-flex min-h-9 flex-wrap items-center gap-x-1 text-charcoal hover:text-brand transition-colors text-xs sm:text-sm";
  return (
    <footer className="bg-white border-t border-line pb-24 pt-12 text-ink sm:pt-16 lg:pb-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-4 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-3.5 lg:col-span-1">
          <Link
            href="/"
            className="flex min-h-10 items-center gap-3 text-ink group"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint border border-brand-line text-brand">
              <Logo className="size-5 text-brand" />
            </div>
            <span className="text-lg font-bold tracking-tight font-display text-ink group-hover:text-brand transition-colors">
              {clinic.name}
            </span>
          </Link>
          <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-sm">
            {clinic.address}
            <br />
            {clinic.location.name} building, Sopore, Kashmir
          </p>
          <div className="text-xs text-muted font-medium pt-1">
            Founder &amp; Managing Director: <span className="text-ink font-semibold">{clinic.founder}</span>
          </div>
        </div>

        <div>
          <h2 className={label}>Clinic Hours</h2>
          <p className="text-ink text-sm font-bold">
            Daily <span className="whitespace-nowrap">{hours}</span>
          </p>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Visiting specialists consult on fixed weekly OPD roster. In-house diagnostics open daily.
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="order-last col-span-2 sm:order-none sm:col-span-1"
        >
          <h2 className={label}>Navigation</h2>
          <ul className="flex flex-wrap gap-x-5 sm:flex-col sm:space-y-1">
            {[...NAV, { href: "/book", label: "Book Consultation" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={label}>Direct Helplines</h2>
          <ul className="space-y-1.5">
            <li>
              <a href={`tel:${clinic.phone}`} className={link}>
                Reception:{" "}
                <span className="whitespace-nowrap font-bold text-ink ml-1">{clinic.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${clinic.whatsapp}`} className={link}>
                WhatsApp:{" "}
                <span className="whitespace-nowrap font-bold text-ink ml-1">
                  {clinic.whatsappDisplay}
                </span>
              </a>
            </li>
            <li>
              <a href={clinic.mapUrl} className={`${link} text-brand font-semibold`}>
                Google Maps Directions ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-x-6 border-t border-line px-4 sm:px-6 pt-5 text-xs text-muted">
        <p className="py-1">
          &copy; {new Date().getFullYear()} {clinic.name}, Sopore.{" "}
          <span className="text-charcoal">
            24h Emergency? Visit SDH Hospital opposite, or dial{" "}
            <a
              href={`tel:${clinic.emergency.phone}`}
              className="font-bold text-emergency underline ml-0.5"
            >
              {clinic.emergency.phone}
            </a>
            .
          </span>
        </p>
        <div className="flex items-center gap-5">
          <Link
            href="/admin"
            className="inline-flex min-h-9 items-center text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            Staff Portal
          </Link>
          <Link
            href="/privacy"
            className="inline-flex min-h-9 items-center text-xs text-muted hover:text-ink transition-colors"
          >
            Privacy Notice
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function QuickActions() {
  return (
    <>
      {/* Phones and tablets: bottom tab bar with Home, Doctors, Book and More */}
      <TabBar />

      {/* Wide screens: floating WhatsApp button */}
      <aside aria-label="WhatsApp">
        <a
          href={`https://wa.me/${clinic.whatsapp}`}
          aria-label={`Message the clinic on WhatsApp, ${clinic.whatsappDisplay}`}
          title="WhatsApp"
          className="fixed bottom-6 right-6 z-40 hidden [view-transition-name:wa-float] size-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl hover:bg-[#20ba59] hover:scale-105 active:scale-95 transition-all lg:inline-flex"
        >
          <ChatIcon className="size-7" />
        </a>
      </aside>
    </>
  );
}

/** Title block at the top of inner pages. */
export function PageIntro({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-5 pt-7 sm:pb-6 sm:pt-14">
      <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-tight sm:text-5xl">
        {title}
      </h1>
      {children && (
        <div className="mt-2 max-w-2xl text-muted sm:mt-3 sm:text-lg">
          {children}
        </div>
      )}
    </div>
  );
}
