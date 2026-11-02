// Modern Architectural / Clinical Doctor Identity Mark
// Mist tile with deep teal initial (design v3).

import type { Doctor } from "@/data/clinic";
import { CategoryIcon } from "./Icons";

export function DoctorMark({
  doctor,
  className = "size-12 rounded-xl text-lg",
}: {
  doctor: Doctor;
  className?: string;
}) {
  const initial = doctor.name?.replace(/^Dr\.?\s*/, "").charAt(0) || "D";

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center font-bold bg-brand-tint text-brand select-none overflow-hidden ${className}`}
    >
      <span className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-medium tracking-tight">{initial}</span>
        <span className="mt-0.5 opacity-70">
          <CategoryIcon category={doctor.category} className="size-3 text-brand" />
        </span>
      </span>
    </span>
  );
}
