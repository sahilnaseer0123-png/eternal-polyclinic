// Gives the booking form the real time for this visitor (see io() in the Next.js 16 docs),
// so available days and slots are never frozen at build time.

import { io } from "next/cache";
import { BookingForm } from "./BookingForm";

export async function BookingSection() {
  await io();
  const now = new Date(); // per request, after io(), as the Next.js 16 docs show
  return <BookingForm nowMs={now.getTime()} />;
}

export function BookingSkeleton() {
  return <div className="h-96 animate-pulse rounded-3xl border border-line bg-white" aria-busy="true" />;
}
