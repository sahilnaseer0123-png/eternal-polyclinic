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
  const label = "mb-3 font-sans text-[13.5px] font-bold uppercase tracking-[0.14em] text-mint";
  const link = "inline-flex min-h-10 items-center gap-x-1 text-sm text-night-muted hover:text-white";
  return (
    <footer className="bg-night pb-24 pt-12 text-ground sm:pt-16 lg:pb-12">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-8 gap-y-10 px-5 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
          <Link href="/" className="flex min-h-11 items-center gap-3">
            <Logo className="size-10 shrink-0" />
            <span className="font-display text-xl font-medium tracking-tight">{clinic.name}</span>
          </Link>
          <p className="max-w-sm text-[15px] leading-relaxed text-night-muted">
            {clinic.address}
            <br />
            {clinic.location.name} building, Sopore, Kashmir
          </p>
          <p className="text-sm text-night-muted">
            Founder: <span className="font-semibold text-ground">{clinic.founder}</span>
          </p>
        </div>

        <div>
          <h2 className={label}>Hours</h2>
          <p className="text-base font-bold">
            Daily <span className="whitespace-nowrap">{hours}</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-night-muted">
            Visiting specialists sit on fixed days. See who&rsquo;s in on the home page.
          </p>
        </div>

        <nav aria-label="Footer" className="order-last col-span-2 sm:order-none sm:col-span-1">
          <h2 className={label}>Pages</h2>
          <ul className="flex flex-wrap gap-x-5 sm:flex-col">
            {[...NAV, { href: "/book", label: "Book a visit" }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={label}>Contact</h2>
          <ul>
            <li>
              <a href={`tel:${clinic.phone}`} className={link}>
                Call <span className="whitespace-nowrap font-bold text-ground">{clinic.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${clinic.whatsapp}`} className={link}>
                WhatsApp <span className="whitespace-nowrap font-bold text-ground">{clinic.whatsappDisplay}</span>
              </a>
            </li>
            <li>
              <a href={clinic.mapUrl} className={`${link} font-semibold text-mint`}>
                Directions ↗
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-x-6 border-t border-night-line px-5 pt-5 text-sm text-night-muted sm:px-6">
        <p className="py-1">
          &copy; {new Date().getFullYear()} {clinic.name}, Sopore. Not an emergency service: go to SDH Hospital opposite
          (open 24 hours) or call{" "}
          <a href={`tel:${clinic.emergency.phone}`} className="font-bold text-ground underline">
            {clinic.emergency.phone}
          </a>
          .
        </p>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="inline-flex min-h-10 items-center hover:text-white">
            Privacy notice
          </Link>
          <Link href="/admin" className="inline-flex min-h-10 items-center text-night-muted/60 hover:text-white">
            Staff
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
          className="ep-wa-float fixed bottom-6 right-6 z-40 hidden [view-transition-name:wa-float] size-14 items-center justify-center rounded-full bg-brand text-white ring-1 ring-white/15 shadow-elevated hover:bg-brand-dark hover:scale-105 active:scale-95 transition-all lg:inline-flex"
        >
          <ChatIcon className="size-7 text-white" />
        </a>
      </aside>
    </>
  );
}

/** Title block at the top of inner pages. */
export function PageIntro({
  title,
  children,
  className,
}: {
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "mx-auto max-w-6xl px-5 pt-6 pb-3 sm:pt-8 sm:pb-4 sm:px-6"}>
      <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
        {title}
      </h1>
      {children && (
        <div className="mt-2 max-w-2xl text-muted sm:mt-2.5 sm:text-lg leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}
