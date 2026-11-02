"use client";

// Interactive Patient Review Submission Modal for Eternal Polyclinic.
// Allows patients to write genuine feedback directly on the website, saves it instantly to the store,
// and offers a 1-tap pathway to paste it directly onto Google Maps.

import { useState } from "react";
import { clinic } from "@/data/clinic";
import { GoogleIcon, StarIcon, WhatsAppIcon } from "./Icons";
import { formatReviewWhatsApp, saveReview, type PatientReview } from "@/lib/reviews";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReviewModal({ isOpen, onClose }: ReviewModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("General Medicine");
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [submittedReview, setSubmittedReview] = useState<PatientReview | null>(null);

  if (!isOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!text.trim() || text.trim().length < 10) {
      setError("Please share at least a sentence about your consultation or visit experience.");
      return;
    }

    const todayDate = new Date().toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });

    const newRev = saveReview({
      name: name.trim(),
      location: location.trim() || "Sopore",
      department: department || undefined,
      rating,
      date: todayDate,
      text: text.trim(),
    });

    setSubmittedReview(newRev);
  }

  function handleReset() {
    setName("");
    setLocation("");
    setText("");
    setRating(5);
    setSubmittedReview(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="relative w-full max-w-lg rounded-2xl bg-white border border-line p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-4 right-4 text-muted hover:text-ink text-xl font-bold p-2 leading-none"
          aria-label="Close review dialog"
        >
          ✕
        </button>

        {submittedReview ? (
          <div className="text-center py-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-200">
              <span className="text-2xl">✓</span>
            </div>
            <h3 id="review-modal-title" className="text-xl sm:text-2xl font-bold text-ink font-display mb-2">
              Thank You for Your Feedback
            </h3>
            <p className="text-sm text-charcoal mb-6 max-w-md mx-auto leading-relaxed">
              Your review has been recorded and published on the Eternal Polyclinic verified patient stories page.
            </p>

            <div className="rounded-xl border border-line bg-ground p-4 text-left mb-6">
              <div className="flex items-center gap-1 text-amber-500 mb-1">
                {[...Array(submittedReview.rating)].map((_, i) => (
                  <StarIcon key={i} className="size-4 fill-current" />
                ))}
              </div>
              <p className="text-xs text-charcoal italic leading-relaxed mb-2">
                &ldquo;{submittedReview.text}&rdquo;
              </p>
              <div className="text-[11px] text-muted font-medium">
                — {submittedReview.name} · {submittedReview.location}
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={clinic.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-subtle hover:bg-brand-dark transition-colors"
              >
                <GoogleIcon className="size-4" />
                <span>Also Post This on Google Maps ↗</span>
              </a>

              <a
                href={`https://wa.me/919797796909?text=${encodeURIComponent(formatReviewWhatsApp(submittedReview))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-2.5 text-xs font-semibold text-charcoal hover:bg-ground transition-colors"
              >
                <WhatsAppIcon className="size-3.5 text-emerald-600" />
                <span>Send to Reception WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-medium text-muted hover:text-ink pt-2"
              >
                Done / Back to Website
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GoogleIcon className="size-4" />
                <span className="text-[11px] font-semibold text-brand uppercase tracking-wider">
                  Patient Experience
                </span>
              </div>
              <h3 id="review-modal-title" className="text-xl sm:text-2xl font-bold text-ink font-display">
                Share Your Patient Story
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Visited Eternal Polyclinic Sopore? Your honest review helps other patients and families across Kashmir find the right care.
              </p>
            </div>

            {/* Rating Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-charcoal mb-1.5">
                Your Rating
              </label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        type="button"
                        key={star}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(star)}
                        className="p-1 text-amber-500 transition-transform hover:scale-110 focus:outline-none"
                        aria-label={`Rate ${star} out of 5 stars`}
                      >
                        <StarIcon className={`size-6 ${active ? "fill-current" : "stroke-current fill-none text-stone"}`} />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-bold text-ink">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            {/* Name & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="rev-name" className="block text-xs font-semibold text-charcoal mb-1">
                  Patient Name *
                </label>
                <input
                  id="rev-name"
                  type="text"
                  required
                  placeholder="e.g. Tariq Ahmad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 border border-line rounded-lg bg-ground text-ink focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="rev-location" className="block text-xs font-semibold text-charcoal mb-1">
                  Area / Town (e.g. Sopore, Rafiabad)
                </label>
                <input
                  id="rev-location"
                  type="text"
                  placeholder="e.g. Zaingeer, Sopore"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs sm:text-sm p-2.5 border border-line rounded-lg bg-ground text-ink focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Department */}
            <div>
              <label htmlFor="rev-department" className="block text-xs font-semibold text-charcoal mb-1">
                Consultant / Service Visited
              </label>
              <select
                id="rev-department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 border border-line rounded-lg bg-ground text-ink focus:border-brand focus:bg-white focus:outline-none"
              >
                <option value="General Medicine">General Medicine &amp; Diabetes</option>
                <option value="Cardiology">Cardiology &amp; Echo</option>
                <option value="Dermatology">Dermatology &amp; Cosmetology</option>
                <option value="Psychiatry & De-addiction">Psychiatry &amp; De-addiction</option>
                <option value="Neurosurgery">Neurosurgery &amp; Spine</option>
                <option value="Orthopaedics">Orthopaedics &amp; Joint Pain</option>
                <option value="USG & Diagnostics">Ultrasound (USG) &amp; Lab</option>
                <option value="Pharmacy & Reception">Pharmacy &amp; Reception Desk</option>
              </select>
            </div>

            {/* Review text */}
            <div>
              <label htmlFor="rev-text" className="block text-xs font-semibold text-charcoal mb-1">
                Your Experience *
              </label>
              <textarea
                id="rev-text"
                required
                rows={3}
                placeholder="Share your thoughts about doctor consultation, waiting time, ultrasound report, or staff behavior..."
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full text-xs sm:text-sm p-2.5 border border-line rounded-lg bg-ground text-ink focus:border-brand focus:bg-white focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium">
                {error}
              </p>
            )}

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg px-4 py-2 text-xs font-medium text-charcoal hover:bg-ground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-subtle hover:bg-brand-dark transition-colors"
              >
                Submit Review
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

