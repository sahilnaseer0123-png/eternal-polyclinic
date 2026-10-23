"use client";

// Doctor cards with a speciality filter. The list itself comes from data/clinic.ts.

import Link from "next/link";
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
    <div className="flex flex-col gap-4 sm:gap-6">
      <div role="group" aria-label="Filter doctors by speciality" className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = filter === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(o.id)}
              className={`min-h-11 rounded-full border px-4 text-base font-semibold sm:px-5 sm:text-base ${
                on ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* The fee is the same for every doctor, so it's said once in the page intro, not on each card. */}
      <ul className="grid gap-3 sm:gap-5 md:grid-cols-2">
        {shown.map((doctor) => {
          const opd = opdSummary(doctor);
          return (
            <li key={doctor.id} className="flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4 sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <DoctorAvatar doctor={doctor} size={48} />
                <div className="min-w-0">
                  <h3 className="text-lg font-bold leading-snug sm:text-xl">{doctor.name ?? doctor.speciality}</h3>
                  <p className="text-base text-muted sm:text-base">
                    {doctor.name ? `${doctor.speciality} · ` : ""}
                    {doctor.degree}
                    {doctor.experienceYears ? ` · ${doctor.experienceYears} yrs` : ""}
                  </p>
                </div>
              </div>
              <span className="hidden items-center gap-2 self-start rounded-lg sm:inline-flex bg-brand-tint px-3 py-1 text-base font-semibold text-brand sm:text-base">
                <CategoryIcon category={doctor.category} />
                {doctor.categoryLabel}
              </span>
              <p className="flex items-start gap-2 text-base">
                <CalendarIcon className="mt-0.5 size-5 shrink-0 text-brand" />
                <span>{opd ?? "Days coming soon. Please call to ask."}</span>
              </p>
              {opd ? (
                <Link
                  href={`/book?doctor=${doctor.id}`}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-5 font-semibold text-white hover:bg-brand-dark sm:self-start sm:text-base"
                >
                  Book {doctor.name ?? "appointment"}
                </Link>
              ) : (
                <a
                  href={`tel:${clinic.phone}`}
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl border border-brand px-5 font-semibold text-brand hover:bg-brand-tint sm:self-start sm:text-base"
                >
                  Call to book
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
