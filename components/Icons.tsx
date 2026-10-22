// Simple stroke icons. Decorative by default (aria-hidden); the text next to them carries the meaning.

import type { DoctorCategory } from "@/data/clinic";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

export function PhoneIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

export function ChatIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.5A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  );
}

export function CalendarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function MapPinIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function ClockIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function CategoryIcon({ category, className = "size-4" }: IconProps & { category: DoctorCategory }) {
  switch (category) {
    case "skin":
      return (
        <svg {...base} className={className}>
          <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />
        </svg>
      );
    case "mind":
      return (
        <svg {...base} className={className}>
          <path d="M9 21v-4a7 7 0 1 1 9-6.7l1.8 3.2H18v3a2 2 0 0 1-2 2h-2v2.5" />
        </svg>
      );
    case "general":
      return (
        <svg {...base} className={className}>
          <path d="M5 3v6a5 5 0 0 0 10 0V3" />
          <path d="M10 14v1a5 5 0 0 0 10 0v-1" />
          <circle cx="20" cy="12" r="2" />
        </svg>
      );
    case "brain":
      return (
        <svg {...base} className={className}>
          <path d="M12 2v20M8 5h8M7 10h10M8 15h8M9 20h6" />
        </svg>
      );
  }
}
