// V0 public page: doctors, services and contact, all read from data/clinic.ts.
// Step 5 replaces this with the full design from the mockups (Who's in today, booking form, schedule).

import { clinic, doctors, services, type Doctor } from "@/data/clinic";
import { formatTime } from "@/lib/schedule";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function opdText(doctor: Doctor): string {
  if (doctor.opd.length === 0) return "Timings coming soon. Please call.";
  return doctor.opd
    .map((s) => `${DAY_NAMES[s.day]}, ${formatTime(s.start)} – ${formatTime(s.end)}`)
    .join(" · ");
}

function CallButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={`tel:${clinic.phone}`}
      className={`inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-6 font-semibold text-white hover:bg-brand-dark ${className}`}
    >
      Call {clinic.phoneDisplay}
    </a>
  );
}

export default function Home() {
  return (
    <>
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-xl bg-brand text-xl font-bold text-white">
              E
            </span>
            <div className="leading-tight">
              <p className="font-bold">{clinic.name}</p>
              <p className="text-sm text-muted">{clinic.address}</p>
            </div>
          </div>
          <CallButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-6">
        <section className="py-14">
          <p className="font-semibold text-brand">Specialist doctors in Sopore</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            See the right specialist, close to home.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">
            Visiting specialists on fixed days, tests and a pharmacy under one roof. Open 7 am – 8 pm.
            Consultation ₹{clinic.consultationFee}.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <CallButton />
            <a
              href={`https://wa.me/${clinic.whatsapp}`}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-6 font-semibold hover:border-brand"
            >
              WhatsApp us
            </a>
          </div>
        </section>

        <section aria-labelledby="doctors" className="py-10">
          <h2 id="doctors" className="text-3xl font-bold">Our doctors</h2>
          <p className="mt-1 text-muted">Each specialist sits on fixed days. Call to book your slot.</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {doctors.map((doctor) => (
              <li key={doctor.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-6">
                <h3 className="text-xl font-bold">{doctor.name ?? doctor.speciality}</h3>
                {doctor.name && <p className="font-medium">{doctor.speciality}</p>}
                <p className="text-muted">
                  {doctor.degree}
                  {doctor.experienceYears ? ` · ${doctor.experienceYears} years of experience` : ""}
                </p>
                <p className="rounded-xl bg-brand-tint px-4 py-3">
                  <span className="font-semibold">OPD:</span> {opdText(doctor)}
                </p>
                <p>
                  <span className="font-semibold">Consultation:</span> ₹{clinic.consultationFee}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="services" className="py-10">
          <h2 id="services" className="text-3xl font-bold">Tests and services in-house</h2>
          <p className="mt-1 text-muted">No need to go elsewhere for scans, reports or medicines.</p>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.id} className="rounded-2xl border border-line bg-white p-6">
                <h3 className="text-xl font-bold">{service.name}</h3>
                <p className="mt-1 text-muted">{service.description}</p>
                {service.lead && <p className="mt-2 font-medium">With {service.lead}</p>}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="visit" className="py-10">
          <div className="rounded-2xl border border-line bg-white p-8">
            <h2 id="visit" className="text-3xl font-bold">Visit us</h2>
            <p className="mt-3 text-lg">{clinic.address}</p>
            <p className="text-muted">Open 7:00 am – 8:00 pm</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CallButton />
              <a
                href={clinic.mapUrl}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line px-6 font-semibold hover:border-brand"
              >
                Get directions
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-10 bg-ink py-8 text-slate-300">
        <div className="mx-auto flex max-w-5xl flex-wrap justify-between gap-4 px-6 text-base">
          <p className="font-semibold text-white">{clinic.name}, Sopore</p>
          <p>Founder &amp; Owner: {clinic.founder}</p>
          <p>
            {clinic.address} · <a href={`tel:${clinic.phone}`} className="underline">{clinic.phoneDisplay}</a>
          </p>
        </div>
      </footer>
    </>
  );
}
