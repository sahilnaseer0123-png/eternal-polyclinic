// Architectural / Swiss Minimalist Doctor Mark
// Muted medical teal (#397C78) & warm off-white badge with subtle hairline border.

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
      className={`relative flex shrink-0 items-center justify-center font-bold bg-[#F2F7F6] text-[#397C78] border border-[#C4DBD8] select-none overflow-hidden ${className}`}
    >
      <span className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-bold tracking-tight">{initial}</span>
        <span className="mt-0.5 opacity-60">
          <CategoryIcon category={doctor.category} className="size-3 text-[#397C78]" />
        </span>
      </span>
    </span>
  );
}
