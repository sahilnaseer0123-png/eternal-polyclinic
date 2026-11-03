"use client";

// Doctors list (design C): a find box that narrows the list as you type, speciality chips,
// and one card per doctor. Everything comes from data/clinic.ts.
// /doctors?type=skin opens with that chip chosen (see app/doctors/page.tsx).

import Link from "next/link";
import { useState } from "react";
import { categories, clinic, doctors, services, type DoctorCategory } from "@/data/clinic";
import { DAY_NAMES, formatTime } from "@/lib/schedule";
import { DoctorMark } from "./DoctorMark";
import { NextAvailable } from "./NextAvailable";
import { ChevronRightIcon, SearchIcon, ServiceIcon } from "./Icons";

export type Filter = "all" | DoctorCategory;

/**
 * Strips explanatory phrases in parentheses (e.g. "(bluish lips or skin)", "(radiating leg pain)")
 * while preserving acronyms like "(BPH)", "(UTI)", "(STDs)", "(USG)", "(KUB)".
 */
const cleanForSearch = (s: string) =>
  s.replace(/\([^)]*?\)/g, (match) => {
    const inner = match.slice(1, -1).trim();
    if (/^[A-Z0-9/ -]{2,6}$/.test(inner)) return ` ${inner} `;
    return " ";
  });

// Every word typed must appear somewhere in the doctor's details.
// Specialty and category take priority over secondary mentions.
const matches = (query: string, ...fields: (string | null | undefined)[]) => {
  const text = fields
    .filter(Boolean)
    .map((f) => cleanForSearch(String(f)))
    .join(" ")
    .toLowerCase();
  return query.split(/\s+/).every((word) => text.includes(word));
};

export function DoctorDirectory({ initialFilter = "all", initialQuery = "" }: { initialFilter?: Filter; initialQuery?: string }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();

  const shown = doctors.filter((d) => {
    if (filter !== "all" && d.category !== filter) return false;
    if (!q) return true;
    // When searching specifically for "skin", only dermatology specialists should match
    if (q === "skin" && d.category !== "skin" && !d.speciality.toLowerCase().includes("skin") && !d.speciality.toLowerCase().includes("dermat")) {
      return false;
    }
    return matches(
      q,
      d.name,
      d.speciality,
      d.categoryLabel,
      categories.find((c) => c.id === d.category)?.label,
      ...d.concerns,
    );
  });
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

      <div role="group" aria-label="Filter doctors by speciality" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:w-auto sm:px-0 sm:flex-wrap w-[calc(100%+2.5rem)] max-w-none">
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
        <ul className="grid gap-3.5 sm:gap-4 md:grid-cols-2">
          {shown.map((doctor) => {
            const hasOpd = doctor.opd.length > 0;
            return (
              <li
                key={doctor.id}
                id={`doctor-${doctor.id}`}
                className="bg-white flex flex-col justify-between rounded-2xl border border-line p-5 hover:border-brand-line transition-all duration-200"
              >
                <div>
                  {/* Doctor Identity Header */}
                  <div className="flex items-start gap-4">
                    <DoctorMark
                      doctor={doctor}
                      className="size-14 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-block rounded-full bg-brand-tint border border-brand-line px-2 py-0.5 text-sm font-semibold text-brand">
                          {doctor.categoryLabel}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-medium tracking-tight text-ink mt-1 leading-snug font-display">
                        <Link
                          href={`/doctors/${doctor.id}`}
                          className="hover:text-brand transition-colors"
                        >
                          {doctor.name ?? doctor.speciality}
                        </Link>
                      </h3>
                      {doctor.name && (
                        <p className="text-sm font-semibold text-ink">
                          {doctor.speciality}
                        </p>
                      )}
                      <p className="text-sm text-muted mt-0.5">
                        {[
                          doctor.degree &&
                          doctor.degree.toLowerCase() !==
                            doctor.speciality.toLowerCase()
                            ? doctor.degree
                            : null,
                          doctor.experienceYears
                            ? `${doctor.experienceYears} yrs experience`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>

                  {/* Structured Timings & Availability */}
                  <div className="mt-4 rounded-xl border border-line bg-ground p-3 text-sm">
                    {hasOpd ? (
                      <div className="space-y-1.5">
                        {doctor.opd.map((s, idx) => {
                          const dayLabel =
                            s.recurrence === "first-of-month"
                              ? `1st ${DAY_NAMES[s.day]} of every month`
                              : s.recurrence === "alternate"
                                ? `Alternate ${DAY_NAMES[s.day]}s`
                                : DAY_NAMES[s.day];
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-ink"
                            >
                              <span className="font-semibold text-ink">
                                {dayLabel}
                              </span>
                              <span className="tabular-nums text-muted">
                                {formatTime(s.start)} – {formatTime(s.end)}
                              </span>
                            </div>
                          );
                        })}
                        <div className="flex items-center justify-between border-t border-line pt-1.5 text-sm">
                          <span className="text-muted">Next available slot</span>
                          <NextAvailable
                            doctorId={doctor.id}
                            fallback={"—"}
                            prefix=""
                            className="font-bold text-brand"
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted">
                        {doctor.availability ??
                          "Consultation by appointment. Call to confirm."}
                      </p>
                    )}
                  </div>

                  {/* Conditions / Helps With */}
                  <div className="mt-3.5 space-y-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Primary Conditions:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {doctor.concerns.slice(0, 3).map((c) => (
                        <span
                          key={c}
                          className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-sm text-ink"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Refined Action Buttons */}
                <div className="mt-5 grid grid-cols-2 gap-2 pt-2 border-t border-line/80">
                  <Link
                    href={`/doctors/${doctor.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-line bg-white px-3 text-center text-sm font-semibold text-ink hover:bg-ground transition-colors"
                  >
                    View Details
                  </Link>
                  {hasOpd ? (
                    <Link
                      href={`/book?doctor=${doctor.id}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-brand px-3 text-center text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
                    >
                      Book OPD →
                    </Link>
                  ) : (
                    <a
                      href={`tel:${clinic.phone}`}
                      className="inline-flex min-h-10 items-center justify-center rounded-xl bg-ink px-3 text-center text-sm font-semibold text-white hover:bg-brand transition-colors"
                    >
                      Call Helpline
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : shownServices.length === 0 ? (
        <p className="card rounded-3xl p-5">
          No doctor matches that.{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call <span className="whitespace-nowrap">{clinic.phoneDisplay}</span>
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
                  <ChevronRightIcon className="size-5 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
