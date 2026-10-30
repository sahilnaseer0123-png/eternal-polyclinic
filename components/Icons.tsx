// Modern, realistic medical and brand icons.
// Semantic, accessible, and designed for high clinical clarity.

import type { DoctorCategory } from "@/data/clinic";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 24 24",
  "aria-hidden": true,
};

/** Official WhatsApp Brand Vector (Simple Icons verified standard) */
export function WhatsAppIcon({ className = "size-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.53 1.748.814 2.788.815 3.18 0 5.767-2.587 5.768-5.766.001-3.18-2.585-5.767-5.765-5.767zm3.385 8.175c-.145.41-.745.752-1.034.796-.282.043-.637.07-1.03-.058-.239-.078-.544-.188-.958-.368-1.761-.767-2.908-2.535-2.996-2.651-.088-.116-.713-.949-.713-1.809 0-.86.449-1.283.61-1.458.161-.175.352-.219.469-.219.117 0 .234.001.336.006.107.005.251-.041.392.298.146.351.498 1.215.542 1.303.044.088.073.19.015.307-.058.117-.088.19-.175.292-.088.102-.185.228-.264.306-.088.088-.179.183-.077.358.102.175.454.748.974 1.212.67.597 1.235.782 1.41.87.175.088.278.073.381-.044.103-.117.439-.511.556-.687.117-.175.234-.146.395-.088.161.058 1.026.483 1.201.571.175.088.293.131.336.205.044.073.044.424-.101.834zM12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5.006L2 22l5.132-1.346A9.954 9.954 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.577 0-3.056-.442-4.316-1.211l-.31-.19-3.203.84.855-3.123-.208-.33A7.957 7.957 0 0 1 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
    </svg>
  );
}

/** ChatIcon alias pointing to the official WhatsApp logo */
export const ChatIcon = WhatsAppIcon;

/** Ergonomic telephone handset receiver */
export function PhoneIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

/** Structured calendar pad with header and date grid */
export function CalendarIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="8" cy="14" r="1" fill="currentColor" />
      <circle cx="12" cy="14" r="1" fill="currentColor" />
      <circle cx="16" cy="14" r="1" fill="currentColor" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="18" r="1" fill="currentColor" />
      <circle cx="16" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}

/** Realistic location marker pin */
export function MapPinIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21c4-4.5 8-8.5 8-13A8 8 0 1 0 4 8c0 4.5 4 8.5 8 13z" />
      <circle cx="12" cy="8" r="3" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

/** Precision clock face with hands at 10:10 */
export function ClockIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9.5" />
      <polyline points="12 6.5 12 12 15.5 14" strokeWidth={2} />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

/** Medical Trust Shield with embedded checkmark */
export function ShieldCheckIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" strokeWidth={2.2} />
    </svg>
  );
}

/** Multi-story hospital building with medical cross */
export function HospitalIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
      <path d="M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4" />
      <path d="M10 8.5h4M12 6.5v4" strokeWidth={2.2} />
      <rect x="7" y="13" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.25} />
      <rect x="15" y="13" width="2" height="2" rx="0.5" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

/** Doctor with clinical coat & stethoscope */
export function UserIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21c.5-4 3.5-6 6.5-6s6 2 6.5 6" />
      <path d="M10 12.5a2 2 0 0 0 4 0" />
      <path d="M12 14.5v2" strokeWidth={2} />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" />
    </svg>
  );
}

/** Realistic medical stethoscope */
export function StethoscopeIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
      <path d="M3 3h3M12 3h3" />
      <path d="M9 12.5v3a4 4 0 0 0 4 4h1a4 4 0 0 0 4-4v-1" />
      <circle cx="18" cy="13" r="2" fill="currentColor" fillOpacity={0.25} />
    </svg>
  );
}

/** High-contrast search lens */
export function SearchIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <circle cx="11" cy="11" r="7.5" />
      <path d="m16.5 16.5 4.5 4.5" strokeWidth={2.5} />
    </svg>
  );
}

export function HomeIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 10.5 12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5H15v-6a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v6H4.5A1.5 1.5 0 0 1 3 20v-9.5z" />
    </svg>
  );
}

export function MenuIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function CloseIcon({ className = "size-6" }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ChevronRightIcon({ className = "size-5" }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function CheckIcon({ className = "size-4" }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.5} className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/** Detailed clinical icons for each specialty */
export function CategoryIcon({ category, className = "size-4" }: IconProps & { category: DoctorCategory }) {
  switch (category) {
    case "skin":
      // Dermatology & Cosmetology: dropper pipette & clinical skin glow
      return (
        <svg {...base} className={className}>
          <path d="m14 4 6 6-9 9H5v-6l9-9z" />
          <path d="m11 7 6 6" />
          <path d="M3 21h3" />
          <circle cx="18" cy="4" r="1" fill="currentColor" />
        </svg>
      );
    case "mind":
      // Neuropsychiatry: mind profile with active neural thought ripples
      return (
        <svg {...base} className={className}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M16 8a3 3 0 0 1 3 3 3 3 0 0 1-1 2" />
          <path d="M18 5a6 6 0 0 1 0 9" />
          <circle cx="10" cy="7" r="1.25" fill="currentColor" />
        </svg>
      );
    case "general":
      // Internal Medicine & Physician: stethoscope
      return (
        <svg {...base} className={className}>
          <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
          <path d="M3 3h3M12 3h3" />
          <path d="M9 12.5v3a4 4 0 0 0 4 4h1a4 4 0 0 0 4-4v-1" />
          <circle cx="18" cy="13" r="2" fill="currentColor" fillOpacity={0.25} />
        </svg>
      );
    case "brain":
      // Neurosurgery & Neurology: dual cerebral hemispheres with cortical sulci
      return (
        <svg {...base} className={className}>
          <path d="M9.5 2A4.5 4.5 0 0 0 5 6.5a4.48 4.48 0 0 0 .5 2 4.5 4.5 0 0 0 0 7 4.48 4.48 0 0 0-.5 2A4.5 4.5 0 0 0 9.5 22h1V2h-1z" />
          <path d="M14.5 2A4.5 4.5 0 0 1 19 6.5a4.48 4.48 0 0 1-.5 2 4.5 4.5 0 0 1 0 7 4.48 4.48 0 0 1 .5 2A4.5 4.5 0 0 1 14.5 22h-1V2h1z" />
          <path d="M7 11h3.5M7 15h3.5M13.5 11h3.5M13.5 15h3.5" strokeWidth={1.5} />
        </svg>
      );
    case "urology":
      // Urology: paired kidneys and renal pathway
      return (
        <svg {...base} className={className}>
          <path d="M6.5 4c-2 0-3 2-3 4s1 5 3 6c1.5.75 2 0 2-2V7c0-2-1-3-2-3z" />
          <path d="M17.5 4c2 0 3 2 3 4s-1 5-3 6c-1.5.75-2 0-2-2V7c0-2 1-3 2-3z" />
          <path d="M8 12c2 2 3 4 3 6v2h2v-2c0-2 1-4 3-6" />
        </svg>
      );
    case "children":
      // Pediatrics: cheerful child face with hair curl
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="13" r="8" />
          <path d="M12 5V2.5c1.5.8 2.5 0 2.5 0" />
          <circle cx="9.5" cy="12" r="1" fill="currentColor" />
          <circle cx="14.5" cy="12" r="1" fill="currentColor" />
          <path d="M9.5 15.5a3.5 3.5 0 0 0 5 0" strokeWidth={2} />
        </svg>
      );
    case "women":
      // Obstetrics & Gynecology: Venus maternal health symbol
      return (
        <svg {...base} className={className}>
          <circle cx="12" cy="8.5" r="5.5" />
          <path d="M12 14v7" strokeWidth={2} />
          <path d="M9.5 17.5h5" strokeWidth={2} />
        </svg>
      );
    case "heart":
      // Cardiology: anatomical heart with aorta
      return (
        <svg {...base} className={className}>
          <path d="M19.5 13.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.572" />
          <path d="M11 4V2.5M14 4V2.5M9 5V3" strokeWidth={1.5} />
        </svg>
      );
  }
}

/** One realistic icon per in-house service in data/clinic.ts */
export function ServiceIcon({ id, className = "size-6" }: IconProps & { id: string }) {
  switch (id) {
    case "ultrasound":
      // Real ultrasound machine screen with transducer probe & acoustic waves
      return (
        <svg {...base} className={className}>
          <rect x="2" y="3" width="13" height="11" rx="2" />
          <path d="M5 8c1.5-1 3.5 1 5 0s1.5-1 2-1" />
          <path d="M6 18h5M8.5 14v4" />
          <path d="M19 8v4a1.5 1.5 0 0 1-3 0V8a1.5 1.5 0 0 1 3 0z" />
          <path d="M17.5 12v3a2 2 0 0 1-2 2" />
          <path d="M21 7a3 3 0 0 1 0 6" strokeWidth={1.5} />
          <path d="M22.5 5a6 6 0 0 1 0 10" strokeWidth={1.5} />
        </svg>
      );
    case "echo":
      // Real echocardiography heart with dynamic ECG rhythm wave
      return (
        <svg {...base} className={className}>
          <path d="M19.5 12.572l-7.5 7.428l-7.5-7.428a5 5 0 1 1 7.5-6.566 5 5 0 1 1 7.5 6.572" />
          <path d="M3 12.5h3.5l1.5-3 2 5.5 2-4 1.5 1.5H21" strokeWidth={2} />
        </svg>
      );
    case "lab":
      // Real laboratory Erlenmeyer flask with graduated liquid markings
      return (
        <svg {...base} className={className}>
          <path d="M9 3h6M10 3v5l-6.2 10.3A2 2 0 0 0 5.5 21h13a2 2 0 0 0 1.7-2.7L14 8V3" />
          <path d="M6.5 15.5h11" />
          <path d="M11 6h2M11 9h3M10 12h4" strokeWidth={1.25} />
          <circle cx="10" cy="18" r="1" fill="currentColor" />
          <circle cx="14" cy="17.5" r="0.75" fill="currentColor" />
        </svg>
      );
    default:
      // Pharmacy: realistic split medicine capsule pill, scored tablet & Rx cross
      return (
        <svg {...base} className={className}>
          <rect x="2" y="8" width="12" height="6" rx="3" transform="rotate(-45 8 11)" />
          <path d="M6 9l4 4" />
          <circle cx="9.5" cy="7.5" r="0.75" fill="currentColor" />
          <circle cx="16.5" cy="15.5" r="4.5" />
          <path d="M13.5 15.5h6" />
          <path d="M18 4v4M16 6h4" strokeWidth={2} />
        </svg>
      );
  }
}
