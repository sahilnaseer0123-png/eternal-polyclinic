"use client";

// Doctors list (design C): a find box that narrows the list as you type, speciality chips,
// and one card per doctor. Everything comes from data/clinic.ts.
// /doctors?type=skin opens with that chip chosen (see app/doctors/page.tsx).

import Link from "next/link";
import { useState } from "react";
import { categories, clinic, doctors, services, type DoctorCategory } from "@/data/clinic";
import { opdSummary } from "@/lib/schedule";
import { DoctorMark } from "./DoctorMark";
import { CalendarIcon, ChevronRightIcon, SearchIcon, ServiceIcon } from "./Icons";

export type Filter = "all" | DoctorCategory;

const matches = (query: string, ...fields: (string | null | undefined)[]) =>
  fields.some((f) => f?.toLowerCase().includes(query));

export function DoctorDirectory({ initialFilter = "all", initialQuery = "" }: { initialFilter?: Filter; initialQuery?: string }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();

  const shown = doctors.filter(
    (d) =>
      (filter === "all" || d.category === filter) &&
      (!q || matches(q, d.name, d.speciality, d.categoryLabel, categories.find((c) => c.id === d.category)?.label)),
  );
  const shownServices = q ? services.filter((s) => matches(q, s.name, s.short, s.description)) : [];
  const options: { id: Filter; label: string }[] = [{ id: "all", label: "All" }, ...categories];

  const choose = (id: Filter) => {
    setFilter(id);
    // Keep the address shareable: /doctors?type=skin
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", id);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      <div>
        <label htmlFor="find" className="sr-only">
          Find a doctor or service
        </label>
        <div className="card flex items-center gap-3 rounded-2xl px-4 focus-within:outline-3 focus-within:outline-ink sm:max-w-xl">
          <SearchIcon className="size-5 shrink-0 text-brand" />
          {/* text-lg keeps it 16px on phones, so iPhones don't zoom in */}
          <input
            id="find"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a doctor or service"
            autoComplete="off"
            className="min-h-13 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <div role="group" aria-label="Filter doctors by speciality" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:flex-wrap">
        {options.map((o) => {
          const on = filter === o.id;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => choose(o.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 font-semibold sm:px-5 ${
                on ? "bg-ink text-white" : "card hover:text-brand"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        {shown.length} {shown.length === 1 ? "doctor" : "doctors"} shown
      </p>

      {shown.length > 0 ? (
        <ul className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {shown.map((doctor) => {
            const opd = opdSummary(doctor);
            return (
              <li key={doctor.id} id={`doctor-${doctor.id}`} className="card flex flex-col gap-3 rounded-3xl p-4 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <DoctorMark doctor={doctor} className="size-14 rounded-2xl bg-brand-tint text-2xl text-brand sm:size-16" />
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold leading-snug sm:text-xl">
                      <Link href={`/doctors/${doctor.id}`} className="underline-offset-4 hover:text-brand hover:underline">
                        {doctor.name ?? doctor.speciality}
                      </Link>
                    </h3>
                    <p className="text-muted">
                      {doctor.name ? `${doctor.speciality} · ` : ""}
                      {doctor.degree}
                      {doctor.experienceYears ? ` · ${doctor.experienceYears} yrs` : ""}
                    </p>
                    <p className="text-sm font-semibold text-brand">{doctor.categoryLabel}</p>
                  </div>
                </div>
                <p className="flex items-start gap-2 rounded-2xl bg-ground px-3 py-2.5">
                  <CalendarIcon className="mt-0.5 size-5 shrink-0 text-brand" />
                  <span>{opd ?? "Days coming soon. Please call to ask."}</span>
                </p>
                {opd ? (
                  <Link
                    href={`/book?doctor=${doctor.id}`}
                    className="mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl bg-ink px-5 font-bold text-white hover:bg-slate-800"
                  >
                    Book {doctor.name ?? "appointment"}
                  </Link>
                ) : (
                  <a
                    href={`tel:${clinic.phone}`}
                    className="mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-tint px-5 font-bold text-brand hover:bg-brand-line/40"
                  >
                    Call to book
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : shownServices.length === 0 ? (
        <p className="card rounded-3xl p-5">
          No doctor matches that.{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>{" "}
          and reception will guide you.
        </p>
      ) : null}

      {shownServices.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold">Tests and services</h3>
          <ul className="flex flex-col gap-2">
            {shownServices.map((s) => (
              <li key={s.id}>
                <Link href="/services" className="card flex min-h-14 items-center gap-3 rounded-2xl px-4 py-2">
                  <ServiceIcon id={s.id} className="size-6 shrink-0 text-brand" />
                  <span className="flex-1 font-semibold">{s.name}</span>
                  <ChevronRightIcon className="size-5 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
