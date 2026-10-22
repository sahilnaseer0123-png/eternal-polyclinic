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
  return <div className="h-96 animate-pulse rounded-3xl border border-line bg-white" aria-busy="true" />;
}
