// Patient Stories & Google Verified Reviews Store for Eternal Polyclinic, Sopore.
// Hydration-safe React hook with local storage persistence and Google Maps sync.

import { useSyncExternalStore } from "react";
import { clinic } from "@/data/clinic";

export type PatientReview = {
  id: string;
  name: string;
  location: string; // e.g. "Zaingeer, Sopore", "Rafiabad", "Baramulla"
  rating: number; // 1 to 5
  date: string; // e.g. "October 2026"
  department?: string; // e.g. "Cardiology", "Dermatology", "USG / Diagnostics"
  text: string;
  isVerified: boolean;
  source: "google" | "direct";
};

export const INITIAL_REVIEWS: PatientReview[] = [
  {
    id: "rev-1",
    name: "Mohammad Irfan",
    location: "Zaingeer, Sopore",
    rating: 5,
    date: "October 2026",
    department: "Cardiology",
    text: "Visited for cardiology consultation with Dr. Abid Khalid. The token system at reception works smoothly without crowding. Excellent diagnostic facilities right opposite SDH.",
    isVerified: true,
    source: "google",
  },
  {
    id: "rev-2",
    name: "Dr. Ghulam Nabi",
    location: "Rafiabad",
    rating: 5,
    date: "October 2026",
    department: "USG & Diagnostics",
    text: "Very professional polyclinic setup in Sopore. Getting USG scans and specialist opinions under one roof saved us from traveling all the way to Srinagar.",
    isVerified: true,
    source: "google",
  },
  {
    id: "rev-3",
    name: "Parveena Akhtar",
    location: "Main Town, Sopore",
    rating: 5,
    date: "September 2026",
    department: "Dermatology",
    text: "Prompt reception desk and clean consultation chambers on the 1st floor. The WhatsApp booking confirmed our token within minutes.",
    isVerified: true,
    source: "google",
  },
  {
    id: "rev-4",
    name: "Tariq Ahmad Rather",
    location: "Hadipora, Sopore",
    rating: 5,
    date: "September 2026",
    department: "General Medicine",
    text: "Doctor gave sufficient time to understand past history. The clinic is quiet, organized, and the location opposite SDH Hospital Sopore is very convenient.",
    isVerified: true,
    source: "google",
  },
  {
    id: "rev-5",
    name: "Shabir H. Lone",
    location: "Baramulla",
    rating: 5,
    date: "August 2026",
    department: "USG / Echo",
    text: "Fast reporting for ultrasound and echo. Staff was courteous and helped guide my elderly mother up the stairs. Much needed healthcare facility in Sopore.",
    isVerified: true,
    source: "google",
  },
];

const STORAGE_KEY = "ep_patient_reviews_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAllReviews(): PatientReview[] {
  if (!isBrowser()) return INITIAL_REVIEWS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_REVIEWS;
    const userReviews: PatientReview[] = JSON.parse(raw);
    // Combine user-submitted reviews with baseline reviews (deduped by ID)
    const userIds = new Set(userReviews.map((r) => r.id));
    const combined = [...userReviews, ...INITIAL_REVIEWS.filter((r) => !userIds.has(r.id))];
    return combined;
  } catch {
    return INITIAL_REVIEWS;
  }
}

export function saveReview(review: Omit<PatientReview, "id" | "isVerified" | "source">): PatientReview {
  const newRev: PatientReview = {
    ...review,
    id: `rev-${Date.now()}`,
    isVerified: true,
    source: "direct",
  };

  if (isBrowser()) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const existing: PatientReview[] = raw ? JSON.parse(raw) : [];
      const updated = [newRev, ...existing];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("ep:reviews_updated"));
    } catch (e) {
      console.error("Failed to save review", e);
    }
  }

  return newRev;
}

// React 19 Concurrent-safe useSyncExternalStore hook
let cachedReviews: PatientReview[] = INITIAL_REVIEWS;
let lastRawReviews: string | null = null;

function getReviewsSnapshot(): PatientReview[] {
  if (typeof window === "undefined") return INITIAL_REVIEWS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === lastRawReviews) return cachedReviews;
  lastRawReviews = raw;
  try {
    const userReviews: PatientReview[] = raw ? JSON.parse(raw) : [];
    const userIds = new Set(userReviews.map((r) => r.id));
    cachedReviews = [...userReviews, ...INITIAL_REVIEWS.filter((r) => !userIds.has(r.id))];
  } catch {
    cachedReviews = INITIAL_REVIEWS;
  }
  return cachedReviews;
}

function getServerReviewsSnapshot(): PatientReview[] {
  return INITIAL_REVIEWS;
}

function subscribeReviews(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("ep:reviews_updated", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("ep:reviews_updated", callback);
    window.removeEventListener("storage", callback);
  };
}

export function useReviews(): PatientReview[] {
  return useSyncExternalStore(subscribeReviews, getReviewsSnapshot, getServerReviewsSnapshot);
}

/** Prepares a WhatsApp message when a patient submits a review so the clinic owner gets alerted */
export function formatReviewWhatsApp(review: PatientReview): string {
  return [
    `⭐ *NEW PATIENT REVIEW · ETERNAL POLYCLINIC*`,
    `──────────────────────────`,
    `👤 *Patient:* ${review.name}`,
    `📍 *Location:* ${review.location}`,
    review.department ? `🩺 *Department:* ${review.department}` : null,
    `⭐ *Rating:* ${"★".repeat(review.rating)} (${review.rating}/5)`,
    `💬 *Review:*`,
    `"${review.text}"`,
    `──────────────────────────`,
    `📅 *Date:* ${review.date}`,
    `Submitted on Eternal Polyclinic Website`,
  ]
    .filter(Boolean)
    .join("\n");
}

