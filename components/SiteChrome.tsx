// Footer and quick-action buttons shared by every page (see app/layout.tsx).

import Link from "next/link";
import { clinic } from "@/data/clinic";
import { ChatIcon, PhoneIcon } from "./Icons";

export function SiteFooter() {
  return (
    <footer className="bg-ink pb-28 pt-10 text-slate-300 sm:pb-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-base sm:flex-row sm:flex-wrap sm:justify-between">
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
      {/* Phones: sticky Call / Book bar */}
      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-3 border-t border-line bg-white px-4 pb-4 pt-3 sm:hidden"
      >
        <a href={`tel:${clinic.phone}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-white">
          <PhoneIcon /> Call
        </a>
        <Link href="/book" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink font-semibold text-white">
          Book
        </Link>
      </nav>

      {/* Larger screens: floating WhatsApp button */}
      <aside aria-label="WhatsApp">
        <a
          href={`https://wa.me/${clinic.whatsapp}`}
          aria-label={`Message the clinic on WhatsApp, ${clinic.whatsappDisplay}`}
          title="WhatsApp"
          className="fixed bottom-6 right-6 z-40 hidden size-14 items-center justify-center rounded-full bg-ink text-white shadow-lg hover:bg-slate-800 sm:inline-flex"
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
    <div className="mx-auto max-w-6xl px-5 pb-6 pt-10 sm:pt-14">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-lg text-muted">{children}</div>}
    </div>
  );
}
