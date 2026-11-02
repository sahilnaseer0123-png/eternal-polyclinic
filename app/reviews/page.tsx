"use client";

// Dedicated Patient Stories & Google Reviews Page for Eternal Polyclinic, Sopore.
// Modeled directly after MedScan Diagnostics & Cleveland Clinic patient story architecture.

import { useState } from "react";
import Link from "next/link";
import { clinic } from "@/data/clinic";
import { GoogleIcon, StarIcon } from "@/components/Icons";
import { useReviews } from "@/lib/reviews";
import { ReviewModal } from "@/components/ReviewModal";

export default function ReviewsPage() {
  const reviews = useReviews();
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const departments = [
    { id: "all", label: "All Stories" },
    { id: "Cardiology", label: "Cardiology" },
    { id: "Dermatology", label: "Dermatology" },
    { id: "USG & Diagnostics", label: "Ultrasound & Lab" },
    { id: "General Medicine", label: "General Medicine" },
  ];

  const filtered = selectedDept === "all"
    ? reviews
    : reviews.filter((r) => r.department?.toLowerCase().includes(selectedDept.toLowerCase()));

  return (
    <div className="bg-ground min-h-screen text-ink pb-20">
      {/* Inner Hero (MedScan Benchmark) */}
      <section className="bg-white border-b border-line py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-muted mb-4">
            <Link href="/" className="hover:text-brand transition-colors">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-charcoal font-medium">Patient stories</span>
          </nav>

          <div className="max-w-2xl">
            <span className="inline-block rounded-md bg-brand-tint border border-brand-line/60 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand mb-2">
              Patient stories
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-ink font-display">
              Care, in<br />their own words.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-charcoal leading-relaxed">
              Explore our Google ratings and read verified experiences from families across Sopore, Baramulla, and North Kashmir.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-10">
        {/* Google Reviews Action Banner */}
        <div className="rounded-2xl border border-brand-line/80 bg-white p-6 sm:p-8 shadow-card mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <GoogleIcon className="size-4" />
              <span className="text-xs font-bold tracking-wider uppercase text-brand">
                Google Reviews · Sopore
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-ink font-display">
              Share your experience
            </h2>
            <p className="text-xs sm:text-sm text-charcoal mt-1.5 leading-relaxed">
              Visited Eternal Polyclinic opposite SDH Sopore? Your feedback helps fellow patients choose the right consultant with confidence.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5 shrink-0">
            {/* Rating pill */}
            <div className="flex items-center gap-3 bg-ground border border-line rounded-xl px-4 py-3">
              <span className="text-3xl font-black text-ink font-display">5.0</span>
              <div>
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-[11px] text-muted font-medium mt-0.5">
                  Verified Google Rating
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-semibold text-white shadow-subtle hover:bg-brand-dark transition-colors"
              >
                <span>Write a review on Google</span>
                <span className="text-sm leading-none">↗</span>
              </a>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 py-3 text-xs font-semibold text-charcoal hover:bg-ground hover:text-ink transition-colors"
              >
                <span>+ Share Feedback</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
          <span className="text-xs font-semibold text-muted shrink-0 mr-1">
            Filter by service:
          </span>
          {departments.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedDept(d.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors shrink-0 ${
                selectedDept === d.id
                  ? "bg-brand text-white shadow-subtle"
                  : "bg-white border border-line text-charcoal hover:border-brand-line hover:text-ink"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Stories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((rev) => (
            <article
              key={rev.id}
              className="rounded-2xl border border-line bg-white p-6 flex flex-col justify-between gap-5 shadow-card hover:border-brand-line transition-all"
            >
              <div>
                {/* Quotation mark */}
                <div className="text-4xl leading-none text-brand/30 font-serif mb-2 select-none" aria-hidden="true">
                  &ldquo;
                </div>

                {/* Stars */}
                <div className="flex text-amber-500 mb-3">
                  {[...Array(rev.rating)].map((_, i) => (
                    <StarIcon key={i} className="size-4 fill-current" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
                  {rev.text}
                </p>
              </div>

              <div className="border-t border-line/60 pt-4 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-ink block">{rev.name}</span>
                  <span className="text-[11px] text-muted">
                    {rev.location} {rev.department ? `· ${rev.department}` : ""}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint/60 border border-brand-line/50 px-2 py-0.5 text-[10px] font-semibold text-brand shrink-0">
                  {rev.source === "google" ? "Google Review" : "Verified Patient"}
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* Bottom Disclaimer & Callout */}
        <div className="mt-14 rounded-xl border border-line bg-white p-6 text-center text-xs text-muted leading-relaxed">
          <p className="font-medium text-charcoal mb-1">
            Transparency &amp; Clinical Quality at Eternal Polyclinic
          </p>
          <p className="max-w-2xl mx-auto">
            Google ratings and review counts are shown for our Sopore Center (1st Floor, Lone Complex, Opposite Sub-District Hospital, Sopore) and may change over time. Patient stories are shared for general information and reflect individual patient experiences.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-semibold">
            <a
              href={clinic.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline inline-flex items-center gap-1"
            >
              <span>View Google Maps Listing</span>
              <span>↗</span>
            </a>
            <span className="text-stone">·</span>
            <Link href="/book" className="text-brand hover:underline">
              Book a Specialist Consultation →
            </Link>
          </div>
        </div>
      </main>

      {/* Review Submission Modal */}
      <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
