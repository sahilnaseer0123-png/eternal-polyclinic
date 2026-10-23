// Doctor tile used until real photos arrive (design C): the doctor's initial,
// or the speciality icon when the name isn't confirmed yet.

import type { Doctor } from "@/data/clinic";
import { CategoryIcon } from "./Icons";

export function DoctorMark({ doctor, className = "size-12 rounded-2xl text-xl" }: { doctor: Doctor; className?: string }) {
  const initial = doctor.name?.replace(/^Dr\.?\s*/, "").charAt(0);
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center font-extrabold ${className}`}>
      {initial ?? <CategoryIcon category={doctor.category} className="size-[45%]" />}
    </span>
  );
}
