// Footer shared by every page.

import Link from "next/link";
import { clinic } from "@/data/clinic";

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
