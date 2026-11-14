"use client";

// Home "By appointment" band: specialists with no fixed sitting days. Read live from the clinic's data,
// so when the admin gives a doctor sitting days they move to the day picker straight away.

import Link from "next/link";
import { clinic } from "@/data/clinic";
import { PhoneIcon } from "./Icons";
import { useByAppointmentDoctors } from "./DoctorSittings";

export function ByAppointmentSection() {
  const byAppointment = useByAppointmentDoctors();
  if (byAppointment.length === 0) return null;
  return (
      
        <section aria-labelledby="by-appointment" className="bg-ground">
          <div className="mx-auto max-w-6xl px-5 pb-12 sm:px-6 sm:pb-20">
            <div className="reveal rounded-3xl bg-sand p-6 sm:p-10">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <p className="eyebrow text-muted">By appointment</p>
                  <h2 id="by-appointment" className="mt-3 text-3xl font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
                    Any day, <em className="ep-mark">by appointment</em>
                  </h2>
                  <p className="mt-3 max-w-xl text-base text-muted">
                    These specialists don&rsquo;t sit on fixed days. Call reception to fix a time.
                  </p>
                </div>
                <a
                  href={`tel:${clinic.phone}`}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark transition-colors self-start sm:self-auto shrink-0 shadow-xs"
                >
                  <PhoneIcon className="size-4 shrink-0" />
                  Call {clinic.phoneDisplay}
                </a>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {byAppointment.map((d) => (
                  <li key={d.id} className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-xs">
                    <div>
                      <h3 className="font-display text-xl font-medium tracking-tight sm:text-2xl">
                        <Link href={`/doctors/${d.id}`} className="hover:text-brand transition-colors">
                          {d.name ?? d.speciality}
                        </Link>
                      </h3>
                      <p className="font-semibold text-brand">{d.speciality}</p>
                      <p className="text-[15px] text-muted">{d.credentials ?? d.degree}</p>
                    </div>
                    <div className="mt-5 pt-3.5 border-t border-line/70 flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">By appointment only</span>
                      <Link
                        href={`/doctors/${d.id}`}
                        className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:text-brand-dark transition-colors"
                      >
                        View profile <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
  );
}
