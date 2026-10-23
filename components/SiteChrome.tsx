// Footer and quick-action buttons shared by every page (see app/layout.tsx).

import Link from "next/link";
import { clinic } from "@/data/clinic";
import { ChatIcon } from "./Icons";
import { TabBar } from "./TabBar";

export function SiteFooter() {
  return (
    <footer className="bg-ink pb-24 pt-7 text-slate-300 sm:pt-10 lg:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 text-base sm:flex-row sm:flex-wrap sm:justify-between sm:gap-3 sm:text-base">
        <p className="font-semibold text-white">{clinic.name}, Sopore</p>
        <p>Founder &amp; Owner: {clinic.founder}</p>
        <p>
          {clinic.address} ·{" "}
          <a href={`tel:${clinic.phone}`} className="underline">
            {clinic.phoneDisplay}
          </a>
        </p>
        <p>
          <Link href="/privacy" className="underline">
            Privacy notice
          </Link>
        </p>
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
      <h1 className="text-[1.5rem] font-bold leading-tight tracking-tight sm:text-5xl">{title}</h1>
      {children && <div className="mt-2 max-w-2xl text-muted sm:mt-3 sm:text-lg">{children}</div>}
    </div>
  );
}
