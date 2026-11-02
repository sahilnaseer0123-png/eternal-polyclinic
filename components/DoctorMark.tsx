// Doctor avatar badge (enhanced with category gradient & clinical styling)
// Displays a clinical specialist portrait icon or the physician's styled initial.

import type { Doctor } from "@/data/clinic";
import { CategoryIcon } from "./Icons";

// Specialty-specific gradient pairings for visual delight and clinical distinction
const CATEGORY_THEMES: Record<string, { bg: string; text: string; ring: string }> = {
  heart: {
    bg: "bg-gradient-to-br from-rose-50 to-rose-100",
    text: "text-rose-600",
    ring: "ring-rose-200/70",
  },
  brain: {
    bg: "bg-gradient-to-br from-indigo-50 to-indigo-100",
    text: "text-indigo-600",
    ring: "ring-indigo-200/70",
  },
  mind: {
    bg: "bg-gradient-to-br from-sky-50 to-sky-100",
    text: "text-sky-600",
    ring: "ring-sky-200/70",
  },
  skin: {
    bg: "bg-gradient-to-br from-amber-50 to-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-200/70",
  },
  urology: {
    bg: "bg-gradient-to-br from-cyan-50 to-cyan-100",
    text: "text-cyan-700",
    ring: "ring-cyan-200/70",
  },
  children: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100",
    text: "text-emerald-700",
    ring: "ring-emerald-200/70",
  },
  women: {
    bg: "bg-gradient-to-br from-pink-50 to-pink-100",
    text: "text-pink-600",
    ring: "ring-pink-200/70",
  },
  general: {
    bg: "bg-gradient-to-br from-teal-50 to-teal-100",
    text: "text-teal-700",
    ring: "ring-teal-200/70",
  },
};

export function DoctorMark({
  doctor,
  className = "size-14 rounded-2xl text-xl",
}: {
  doctor: Doctor;
  className?: string;
}) {
  const theme = CATEGORY_THEMES[doctor.category] || CATEGORY_THEMES.general;
  const initial = doctor.name?.replace(/^Dr\.?\s*/, "").charAt(0) || "D";

  return (
    <span
      aria-hidden="true"
      className={`relative flex shrink-0 items-center justify-center font-extrabold shadow-sm ring-1 select-none overflow-hidden ${theme.bg} ${theme.text} ${theme.ring} ${className}`}
    >
      {/* Background subtle clinical pattern / glow */}
      <span className="absolute inset-0 bg-white/40" />

      {/* Styled Clinical Avatar */}
      <span className="relative z-10 flex flex-col items-center justify-center leading-none">
        <span className="font-display font-black tracking-tight">{initial}</span>
        <span className="mt-0.5 opacity-80">
          <CategoryIcon category={doctor.category} className="size-3.5 sm:size-4" />
        </span>
      </span>
    </span>
  );
}
