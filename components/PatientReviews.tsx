"use client";

// Patient Reviews & Google Stories Component inspired by MedScan Diagnostics & Cleveland Clinic.
// Features official Google rating breakdown, direct Google Maps review trigger,
// clean typographic quote cards, and an interactive patient submission drawer.

import { useState } from "react";
import Link from "next/link";
import { clinic } from "@/data/clinic";
import { GoogleIcon, StarIcon } from "./Icons";
import { useReviews } from "@/lib/reviews";
import { ReviewModal } from "./ReviewModal";

export function PatientReviews() {
  const reviews = useReviews();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Show top 3 featured reviews on the homepage
  const featuredReviews = reviews.slice(0, 3);

  return (
    <section aria-labelledby="patient-reviews" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="card rounded-2xl bg-white p-6 sm:p-10 border border-line shadow-card">
        {/* Google Reviews Action Card (MedScan Style) */}
        <div className="rounded-xl border border-brand-line/70 bg-brand-tint/40 p-6 sm:p-8 mb-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <GoogleIcon className="size-4" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-brand">
                Google Reviews
              </span>
            </div>
            <h2 id="patient-reviews" className="text-2xl sm:text-3xl font-bold tracking-tight text-ink font-display">
              Care, in their own words.
            </h2>
            <p className="text-xs sm:text-sm text-charcoal mt-1.5 leading-relaxed">
              Visited Eternal Polyclinic Sopore? Your feedback helps other families across North Kashmir find reliable specialist care.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5 shrink-0">
            {/* Rating pill */}
            <div className="flex items-center gap-3 bg-white border border-line rounded-xl px-4 py-3 shadow-subtle">
              <span className="text-3xl font-black text-ink font-display">5.0</span>
              <div>
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="text-[11px] text-muted font-medium mt-0.5">
                  Verified Reviews · Sopore
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-semibold text-white shadow-subtle hover:bg-brand-dark transition-colors"
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

        {/* Reviews Section Header */}
        <div className="flex items-center justify-between pb-6 border-b border-line">
          <div>
            <h3 className="text-lg font-bold text-ink font-display">
              Recent Patient Experiences
            </h3>
            <p className="text-xs text-muted">
              Feedback from OPD visits, doctor consultations, and ultrasound scans.
            </p>
          </div>

          <Link
            href="/reviews"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <span>View all stories ({reviews.length})</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>

        {/* Reviews Grid (MedScan Style Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
          {featuredReviews.map((rev) => (
            <article
              key={rev.id}
              className="rounded-xl border border-line bg-ground p-6 flex flex-col justify-between gap-5 transition-all hover:border-brand-line hover:shadow-subtle"
            >
              <div>
                {/* Quotation mark glyph */}
                <div className="text-4xl leading-none text-brand/40 font-serif mb-2 select-none" aria-hidden="true">
                  &ldquo;
                </div>

                {/* Star rating */}
                <div className="flex text-amber-500 mb-2.5">
                  {[...Array(rev.rating)].map((_, i) => (
                    <StarIcon key={i} className="size-3.5 fill-current" />
                  ))}
                </div>

                {/* Review Text */}
                <p className="text-xs sm:text-sm text-charcoal leading-relaxed font-normal">
                  {rev.text}
                </p>
              </div>

              <div className="border-t border-line/60 pt-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-ink block">{rev.name}</span>
                  <span className="text-[11px] text-muted">
                    {rev.location} {rev.department ? `· ${rev.department}` : ""}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-brand-line/60 px-2 py-0.5 text-[10px] font-semibold text-brand shrink-0">
                  Verified
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* MedScan Style Trust Disclaimer */}
        <p className="mt-8 text-center text-[11px] text-muted leading-relaxed max-w-2xl mx-auto">
          Google ratings and review counts are based on actual patient visits at Eternal Polyclinic Sopore (opposite SDH Hospital). Patient stories are shared for general informational purposes.
        </p>
      </div>

      {/* Review Submission Modal */}
      <ReviewModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </section>
  );
}
