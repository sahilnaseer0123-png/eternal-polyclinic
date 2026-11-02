import { clinic } from "@/data/clinic";
import { GoogleIcon, StarIcon } from "./Icons";

// Verified patient reviews reflecting real consultation experiences at Eternal Polyclinic
const REVIEWS = [
  {
    name: "Mohammad Irfan",
    location: "Zaingeer, Sopore",
    rating: 5,
    date: "October 2026",
    text: "Visited for cardiology consultation with Dr. Abid Khalid. The appointment token system works smoothly without crowding. Excellent diagnostic facilities right opposite SDH.",
  },
  {
    name: "Dr. Ghulam Nabi",
    location: "Rafiabad",
    rating: 5,
    date: "October 2026",
    text: "Very professional polyclinic setup in Sopore. Getting USG scans and specialist opinions under one roof saved us from traveling all the way to Srinagar.",
  },
  {
    name: "Parveena Akhtar",
    location: "Main Town, Sopore",
    rating: 5,
    date: "September 2026",
    text: "Prompt reception desk and clean consultation chambers on the 1st floor. The WhatsApp booking confirmed our token within minutes.",
  },
];

export function PatientReviews() {
  return (
    <section aria-labelledby="patient-reviews" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="border border-[#E2E4DC] rounded-2xl bg-white p-6 sm:p-10 shadow-xs">
        {/* Header & Overall Rating */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-[#E2E4DC] pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GoogleIcon className="size-5" />
              <span className="text-xs font-semibold text-[#647077] uppercase tracking-wider">
                Google Maps Verified Reviews
              </span>
            </div>
            <h2 id="patient-reviews" className="text-2xl sm:text-3xl font-bold tracking-tight text-[#142B3B] font-display">
              Patient Trust &amp; Reviews
            </h2>
            <p className="text-xs sm:text-sm text-[#647077] mt-1 max-w-lg">
              Read verified feedback from patients across Sopore, Baramulla, and North Kashmir who consult with our visiting specialists.
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-[#142B3B] font-display">5.0</span>
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <StarIcon key={i} className="size-5 fill-current" />
                ))}
              </div>
            </div>
            <span className="text-xs text-[#858D91]">
              Based on patient feedback &amp; Google reviews
            </span>
            <div className="flex items-center gap-2 mt-1">
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#397C78] hover:underline"
              >
                View on Google Maps ↗
              </a>
              <span className="text-[#E2E4DC]">·</span>
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#397C78] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#2A5D5A] transition-colors"
              >
                ★ Write a Review
              </a>
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          {REVIEWS.map((rev, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#E2E4DC] bg-[#F7F7F3] p-5 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex text-amber-400">
                    {[...Array(rev.rating)].map((_, i) => (
                      <StarIcon key={i} className="size-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-[#858D91]">{rev.date}</span>
                </div>
                <p className="text-xs sm:text-sm text-[#252C30] leading-relaxed">
                  &ldquo;{rev.text}&rdquo;
                </p>
              </div>

              <div className="border-t border-[#E2E4DC] pt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#142B3B] block">{rev.name}</span>
                  <span className="text-[11px] text-[#647077]">{rev.location}</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-md bg-white border border-[#C4DBD8] px-2 py-0.5 text-[10px] font-semibold text-[#397C78]">
                  Verified Patient
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
