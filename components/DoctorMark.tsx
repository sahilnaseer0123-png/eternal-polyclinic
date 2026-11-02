// Doctor avatar badge (MedScan / Hospital clinical standard):
// Clean medical teal & white branding with specialist category vector icon.

import type { Doctor } from "@/data/clinic";
import { CategoryIcon } from "./Icons";

export function DoctorMark({
  doctor,
  className = "size-14 rounded-2xl text-xl",
}: {
  doctor: Doctor;
  className?: string;
}) {
  const initial = doctor.name?.replace(/^Dr\.?\s*/, "").charAt(0) || "D";

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center font-extrabold bg-gradient-to-br from-brand-tint via-white to-teal-50/60 text-brand border border-brand-line/60 shadow-2xs select-none overflow-hidden ${className}`}
    >
      {/* Styled Clinical Avatar */}
      <span className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-black tracking-tight">{initial}</span>
        <span className="mt-0.5 opacity-70">
          <CategoryIcon category={doctor.category} className="size-3.5 sm:size-4 text-brand" />
        </span>
      </span>
    </span>
  );
}
