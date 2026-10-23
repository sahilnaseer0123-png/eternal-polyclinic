import type { Metadata } from "next";
import { Suspense } from "react";
import { clinic } from "@/data/clinic";
import { DoctorDirectory } from "@/components/DoctorDirectory";
import { ScheduleView, WeeklySchedule } from "@/components/WeeklySchedule";
import { PageIntro } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Our doctors and OPD schedule",
  description: `Specialists at ${clinic.name}, Sopore, the days they sit, and how to book. Consultation ₹${clinic.consultationFee}.`,
};

export default function DoctorsPage() {
  return (
    <>
      <PageIntro title="Our doctors">
        Pick by what&apos;s bothering you. Each specialist sits on fixed days every week.
      </PageIntro>

      <section aria-labelledby="all-doctors" className="mx-auto max-w-6xl px-5 pb-6">
        <h2 id="all-doctors" className="sr-only">
          All doctors
        </h2>
        <DoctorDirectory />
        <p className="mt-6 text-base text-muted">
          More specialists visit every week. Not sure who to see?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>{" "}
          and reception will guide you.
        </p>
      </section>

      <section aria-labelledby="schedule" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-16 pt-10">
        <h2 id="schedule" className="text-2xl font-bold sm:text-4xl">
          Weekly OPD schedule
        </h2>
        <p className="mb-6 mt-1 text-muted">Timings can change on holidays, so call if you&apos;re unsure.</p>
        <Suspense fallback={<ScheduleView />}>
          <WeeklySchedule />
        </Suspense>
      </section>
    </>
  );
}
