// Friendly cartoon avatar used until real doctor photos arrive.

import type { Doctor } from "@/data/clinic";

export function DoctorAvatar({ doctor, size = 64 }: { doctor: Doctor; size?: number }) {
  const { skin, hair, beard } = doctor.avatar;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="shrink-0 rounded-full border border-brand-line bg-brand-tint"
    >
      <path d="M10 64c2-12 11-18 22-18s20 6 22 18z" fill="#FFFFFF" stroke="#CBD5E1" />
      <path d="M26 46l6 8 6-8z" fill="#0F766E" />
      <rect x="28" y="37" width="8" height="10" fill={skin} />
      <circle cx="32" cy="27" r="12" fill={skin} />
      <path d="M20 26c0-9 6-14 12-14s12 5 12 14c-2-5-6-7-12-7s-10 2-12 7z" fill={hair} />
      {beard && <path d="M21 29c1 8 5 12 11 12s10-4 11-12c-2 4-6 5-11 5s-9-1-11-5z" fill={hair} />}
      <circle cx="27" cy="28" r="1.5" fill="#0F172A" />
      <circle cx="37" cy="28" r="1.5" fill="#0F172A" />
      <path d="M28 32c2 1.6 6 1.6 8 0" stroke="#0F172A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M25 47c0 7 3 10 7 10s7-3 7-10" stroke="#334155" strokeWidth="1.6" fill="none" />
      <circle cx="32" cy="57" r="2.2" fill="#334155" />
    </svg>
  );
}
