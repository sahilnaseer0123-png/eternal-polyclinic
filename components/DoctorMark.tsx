// Modern Architectural / Clinical Doctor Identity Mark
// Deep medical teal (#1D5D62) & refined crisp container with hairline structural border.

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
      className={`relative flex shrink-0 items-center justify-center font-bold bg-[#EDF5F5] text-[#1D5D62] border border-[#BFD7D7] select-none overflow-hidden shadow-subtle ${className}`}
    >
      <span className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-bold tracking-tight">{initial}</span>
        <span className="mt-0.5 opacity-70">
          <CategoryIcon category={doctor.category} className="size-3 text-[#1D5D62]" />
        </span>
      </span>
    </span>
  );
}
