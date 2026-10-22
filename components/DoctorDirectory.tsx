"use client";

// Doctor cards with a speciality filter. The list itself comes from data/clinic.ts.

import { useState } from "react";
import { categories, clinic, doctors, type DoctorCategory } from "@/data/clinic";
import { opdSummary } from "@/lib/schedule";
import { DoctorAvatar } from "./DoctorAvatar";
import { CalendarIcon, CategoryIcon } from "./Icons";

type Filter = "all" | DoctorCategory;

export function DoctorDirectory() {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = doctors.filter((d) => filter === "all" || d.category === filter);
  const options: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, ...categories];

  return (
    <div className="flex flex-col gap-6">
      <div role="group" aria-label="Filter doctors by speciality" className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = filter === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(o.id)}
              className={`min-h-11 rounded-full border px-5 text-base font-semibold ${
                on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <ul className="grid gap-5 md:grid-cols-2">
        {shown.map((doctor) => {
          const opd = opdSummary(doctor);
          return (
            <li key={doctor.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6">
              <div className="flex items-center gap-4">
                <DoctorAvatar doctor={doctor} size={72} />
                <div className="min-w-0">
                  <h3 className="text-xl font-bold leading-snug">{doctor.name ?? doctor.speciality}</h3>
                  {doctor.name && <p className="font-medium">{doctor.speciality}</p>}
                </div>
              </div>
              <span className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-tint px-3 py-1 text-base font-semibold text-brand">
                <CategoryIcon category={doctor.category} />
                {doctor.categoryLabel}
              </span>
              <p className="text-base text-muted">
                {doctor.degree}
                {doctor.experienceYears ? ` · ${doctor.experienceYears} years of experience` : ""}
              </p>
              <p className="flex items-start gap-3 rounded-xl bg-ground px-4 py-3 text-base">
                <CalendarIcon className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>
                  <span className="font-semibold">OPD:</span> {opd ?? "Timings coming soon. Please call."}
                </span>
              </p>
              <p className="text-base">
                <span className="font-semibold">Consultation:</span> ₹{clinic.consultationFee}
              </p>
              <a
                href={`tel:${clinic.phone}`}
                className="mt-auto inline-flex min-h-11 items-center self-start rounded-xl border border-brand px-5 text-base font-semibold text-brand hover:bg-brand-tint"
              >
                Call to book
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
