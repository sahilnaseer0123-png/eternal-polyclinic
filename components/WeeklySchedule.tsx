// Weekly OPD schedule: a doctor × day grid on wider screens, a day-by-day list on phones.
// The grid itself is static; WeeklySchedule adds today's highlight per request (io() + Suspense).

import { io } from "next/cache";
import { doctors, type Weekday } from "@/data/clinic";
import { clinicClock, DAY_NAMES, formatTimeShort, sessionOn } from "@/lib/schedule";

const WEEK: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // Monday first
const confirmed = doctors.filter((d) => d.opd.length > 0);
const unconfirmed = doctors.filter((d) => d.opd.length === 0);

export function ScheduleView({ today }: { today?: Weekday }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Wider screens: grid */}
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-white md:block">
        <table className="w-full min-w-[46rem] table-fixed border-collapse text-base">
          <caption className="sr-only">Weekly OPD schedule by doctor and day</caption>
          <thead>
            <tr className="bg-ground text-left">
              <th scope="col" className="w-52 px-5 py-3 font-semibold">Doctor</th>
              {WEEK.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className={`px-3 py-3 font-semibold ${day === today ? "bg-brand-tint text-brand" : ""}`}
                >
                  {DAY_NAMES[day].slice(0, 3)}
                  {day === today && <span className="block text-sm font-medium">Today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {confirmed.map((doctor) => (
              <tr key={doctor.id} className="border-t border-line">
                <th scope="row" className="px-5 py-4 text-left font-normal">
                  <span className="block font-semibold">{doctor.name ?? doctor.speciality}</span>
                  <span className="block text-sm text-muted">{doctor.speciality}</span>
                </th>
                {WEEK.map((day) => {
                  const s = sessionOn(doctor, day);
                  return (
                    <td key={day} className={`px-3 py-4 align-middle ${day === today ? "bg-brand-tint" : ""}`}>
                      {s ? (
                        <span className="font-semibold text-brand">
                          {formatTimeShort(s.start)}–<wbr />
                          {formatTimeShort(s.end)}
                        </span>
                      ) : (
                        <span className="text-slate-400" aria-label="Not sitting">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: day by day */}
      <ul className="flex flex-col gap-2 md:hidden">
        {WEEK.map((day) => {
          const sittings = confirmed.flatMap((d) => {
            const s = sessionOn(d, day);
            return s ? [{ doctor: d, s }] : [];
          });
          const isToday = day === today;
          return (
            <li
              key={day}
              className={`rounded-2xl border p-4 ${isToday ? "border-brand bg-brand-tint" : "border-line bg-white"}`}
            >
              <p className="font-bold">
                {DAY_NAMES[day]}
                {isToday && <span className="ml-2 rounded-md bg-brand px-2 py-0.5 text-sm text-white">Today</span>}
              </p>
              {sittings.length > 0 ? (
                <ul className="mt-1">
                  {sittings.map(({ doctor, s }) => (
                    <li key={doctor.id} className="text-base">
                      <span className="font-semibold">{doctor.name ?? doctor.speciality}</span>{" "}
                      <span className="text-muted">({doctor.speciality})</span> ·{" "}
                      <span className="whitespace-nowrap">
                        {formatTimeShort(s.start)}–{formatTimeShort(s.end)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-base text-muted">No visiting specialist</p>
              )}
            </li>
          );
        })}
      </ul>

      {unconfirmed.length > 0 && (
        <p className="text-base text-muted">
          Timings for the {unconfirmed.map((d) => d.speciality.toLowerCase()).join(" and ")} are coming soon. Call to
          ask.
        </p>
      )}
    </div>
  );
}

export async function WeeklySchedule() {
  await io();
  return <ScheduleView today={clinicClock(new Date()).weekday} />;
}
