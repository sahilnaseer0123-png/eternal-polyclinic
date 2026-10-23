// Gives the booking form the real time for this visitor, and the doctor from /book?doctor=<id>.
// Reading searchParams makes this per-request, so days and slots are never frozen at build time.

import { io } from "next/cache";
import { doctors } from "@/data/clinic";
import { BookingForm } from "./BookingForm";

export async function BookingSection({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await io();
  const requested = typeof params.doctor === "string" ? params.doctor : "";
  const initialDoctorId = doctors.some((d) => d.id === requested) ? requested : "";
  const now = new Date(); // per request, as the Next.js 16 docs show
  return <BookingForm key={initialDoctorId} nowMs={now.getTime()} initialDoctorId={initialDoctorId} />;
}

export function BookingSkeleton() {
  // Same height as the empty form, so the page doesn't jump when the form streams in.
  return <div className="card h-[44.5rem] animate-pulse rounded-3xl sm:h-[40rem]" aria-busy="true" />;
}
