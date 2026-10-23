"use client";

// The current time in the visitor's browser, refreshed every minute; null while the page is being
// prerendered on the server. Lets static pages show live things like "Next: Tomorrow, 4:00 pm"
// without freezing the date at build time (CLAUDE.md rule 3). Pair with clinicClock() for clinic time.

import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
};
// Same value for a whole minute, so React sees a stable snapshot between ticks.
const getSnapshot = () => Math.floor(Date.now() / 60_000) * 60_000;
const getServerSnapshot = () => null;

export function useClinicMinute(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
