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
    case "urology":
      return (
        <svg {...base} className={className}>
          <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" />
          <path d="M7 12c0 3 2.5 5 5 5s5-2 5-5" />
          <path d="M12 17v5" />
        </svg>
      );
    case "children":
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="7" r="4" />
          <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          <path d="M9 11a3 3 0 0 0 6 0" />
        </svg>
      );
    case "women":
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="8" r="5" />
          <path d="M12 13v8M9 17h6" />
        </svg>
      );
    case "heart":
      return (
        <svg {...base} className={className}>
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      );
  }
}

export function SearchIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

export function HomeIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" />
    </svg>
  );
}

export function UserIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
    </svg>
  );
}

export function MenuIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

/** One icon per in-house service id in data/clinic.ts. */
export function ServiceIcon({ id, className = "size-6" }: IconProps & { id: string }) {
  switch (id) {
    case "ultrasound":
      return (
        <svg {...base} className={className}>
          <rect x="3" y="3" width="18" height="14" rx="2" />
          <path d="M12 6l-4.5 7a6 6 0 0 0 9 0z" />
          <path d="M9 21h6M12 17v4" />
        </svg>
      );
    case "echo":
      return (
        <svg {...base} className={className}>
          <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
          <path d="M8 12h2l1-2 2 4 1-2h2" />
        </svg>
      );
    case "lab":
      return (
        <svg {...base} className={className}>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3M7.5 15h9" />
        </svg>
      );
    default:
      return (
        <svg {...base} className={className}>
          <rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" />
          <path d="M9.5 9.5l5 5" />
        </svg>
      );
  }
}
