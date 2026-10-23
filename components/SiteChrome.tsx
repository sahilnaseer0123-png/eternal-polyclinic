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
  const label = "mb-2 font-display text-sm font-bold uppercase tracking-wider text-glow";
  const link = "inline-flex min-h-11 flex-wrap items-center gap-x-1 hover:text-white";
  return (
    <footer className="bg-ink pb-24 pt-8 text-slate-300 sm:pt-14 lg:pb-10">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-5 sm:gap-y-8 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col gap-3 lg:col-span-1">
          <Link href="/" className="flex min-h-11 items-center gap-3 text-white">
            <Logo className="size-11 shrink-0" />
            <span className="font-display text-xl font-bold">{clinic.name}</span>
          </Link>
          <p>
            {clinic.address}
            <br />
            {clinic.location.name} building
          </p>
          <p className="text-sm text-slate-400">Founder &amp; Owner: {clinic.founder}</p>
        </div>

        <div>
          <h2 className={label}>Hours</h2>
          <p className="text-white">
            Open <span className="whitespace-nowrap">{hours}</span>
          </p>
          <p className="mt-1 text-sm text-slate-400">Specialists sit on their OPD days only.</p>
        </div>

        <nav aria-label="Footer" className="order-last col-span-2 sm:order-none sm:col-span-1">
          <h2 className={label}>Pages</h2>
          {/* Phones: links wrap on one or two lines; wider screens: a column. */}
          <ul className="flex flex-wrap gap-x-5 sm:block">
            {[...NAV, { href: "/book", label: "Book" }].map((item) => (
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
                Call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${clinic.whatsapp}`} className={link}>
                WhatsApp <span className="whitespace-nowrap">{clinic.whatsappDisplay}</span>
              </a>
            </li>
            <li>
              <a href={clinic.mapUrl} className={link}>
                Get directions
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-wrap items-center justify-between gap-x-6 border-t border-slate-800 px-5 pt-2 text-sm text-slate-400">
        <p className="py-3">{clinic.name}, Sopore</p>
        <Link href="/privacy" className="inline-flex min-h-11 items-center underline hover:text-white">
          Privacy notice
        </Link>
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
          className="fixed bottom-6 right-6 z-40 hidden size-14 items-center justify-center rounded-full bg-ink text-white shadow-lg hover:bg-slate-800 lg:inline-flex"
        >
          <ChatIcon className="size-6" />
        </a>
      </aside>
    </>
  );
}

/** Title block at the top of inner pages. */
export function PageIntro({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-5 pt-7 sm:pb-6 sm:pt-14">
      <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-tight sm:text-5xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted sm:mt-3 sm:text-lg">{children}</div>}
    </div>
  );
}
