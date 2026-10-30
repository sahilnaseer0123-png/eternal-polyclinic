// Shown for any address that doesn't exist (old or mistyped links).

import type { Metadata } from "next";
import Link from "next/link";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "@/components/Icons";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-14 sm:py-20">
      <p className="text-sm font-bold uppercase tracking-wider text-brand">Page not found</p>
      <h1 className="text-[1.5rem] font-extrabold leading-tight tracking-tight sm:text-4xl">
        This page doesn&apos;t exist.
      </h1>
      <p className="text-muted sm:text-lg">The link may be old or mistyped. These will get you where you need to go:</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-ink px-5 font-bold text-white">
          Go to the home page
        </Link>
        <Link href="/book" className="card inline-flex min-h-12 items-center justify-center rounded-2xl px-5 font-bold">
          Book a doctor
        </Link>
      </div>
      <a href={`tel:${clinic.phone}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand">
        <PhoneIcon /> Or call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
      </a>
    </div>
  );
}
