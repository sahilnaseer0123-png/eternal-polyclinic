import type { Metadata } from "next";
import { Suspense } from "react";
import { clinic } from "@/data/clinic";
import { DoctorDirectory } from "@/components/DoctorDirectory";
import { DirectoryFromLink } from "@/components/DirectoryFromLink";
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
        Each specialist sits on fixed days every week. Consultation ₹{clinic.consultationFee} with any doctor.
      </PageIntro>

      <section aria-labelledby="all-doctors" className="mx-auto max-w-6xl px-5 pb-6">
        <h2 id="all-doctors" className="sr-only">
          All doctors
        </h2>
        <Suspense fallback={<DoctorDirectory />}>
          <DirectoryFromLink />
        </Suspense>
        <p className="mt-5 text-muted sm:mt-6">
          More specialists visit every week. Not sure who to see?{" "}
          <a href={`tel:${clinic.phone}`} className="font-semibold text-brand underline">
            Call {clinic.phoneDisplay}
          </a>{" "}
          and reception will guide you.
        </p>
      </section>

      <section aria-labelledby="schedule" className="reveal mx-auto max-w-6xl scroll-mt-24 px-5 pb-10 pt-8 sm:pb-16 sm:pt-10">
        <h2 id="schedule" className="text-xl font-extrabold tracking-tight sm:text-3xl">
          Weekly OPD schedule
        </h2>
        <p className="mb-4 mt-1 text-muted sm:mb-6">Timings can change on holidays, so call if you&apos;re unsure.</p>
        <Suspense fallback={<ScheduleView />}>
          <WeeklySchedule />
        </Suspense>
      </section>
    </>
  );
}
