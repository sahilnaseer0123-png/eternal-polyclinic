// Every fact about the clinic lives in this one file.
// Change it here and the whole site updates. Never hard-code these anywhere else.

/** 0 = Sunday, 1 = Monday ... 6 = Saturday (same as JavaScript's getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One OPD sitting. Times are 24-hour "HH:mm" in clinic time (Asia/Kolkata). */
export type OpdSession = {
  day: Weekday;
  start: string;
  end: string;
};

export type DoctorCategory = "skin" | "mind" | "general" | "brain";

export type Doctor = {
  id: string;
  /** null = name not confirmed yet; the site shows the speciality only. */
  name: string | null;
  speciality: string;
  category: DoctorCategory;
  /** Shown on the filter chip and card, in patient words. */
  categoryLabel: string;
  degree: string;
  experienceYears: number | null;
  registrationNo: string | null;
  /** Empty list = OPD days not confirmed yet; the site tells patients to call. */
  opd: OpdSession[];
  slotMinutes: number;
  /** Path under /public, or null to show the DoctorMark tile (initial or speciality icon). */
  photo: string | null;
  /**
   * Common reasons patients see this kind of specialist, in patient words. General guidance for
   * "What brings you in?" and search, not a promise of treatment. TODO: confirm with each doctor.
   */
  concerns: string[];
};

export const clinic = {
  name: "Eternal Polyclinic",
  siteUrl: "https://eternal-polyclinic.vercel.app",
  founder: "Naseer Ah Lone",
  address: "Opposite SDH Hospital, Sopore",
  /** For calls. */
  phone: "+919797796909",
  phoneDisplay: "97977 96909",
  /** For WhatsApp: booking requests arrive here. A different number from calls. */
  whatsapp: "919419055528",
  whatsappDisplay: "94190 55528",
  hours: { open: "07:00", close: "20:00" },
  consultationFee: 300,
  timeZone: "Asia/Kolkata",
  /**
   * The clinic's exact spot: the Old Municipal Office building, Sopore (plus code 7FV4+G2G),
   * confirmed by the clinic. Always link by coordinates: a Google Maps search for the clinic's
   * name finds a DIFFERENT clinic.
   */
  location: { name: "Old Municipal Office", lat: 34.2938233, lng: 74.455089 },
  mapUrl: "https://www.google.com/maps/dir/?api=1&destination=34.2938233,74.455089",
  mapEmbedUrl: "https://maps.google.com/maps?q=34.2938233,74.455089&z=18&output=embed",
  /** Shown wherever patients might book: the clinic is not an emergency service. 112 = India's emergency number. */
  emergency: { phone: "112", place: "the emergency department at SDH Hospital, right opposite" },
} as const;

/** In-house tests and services. Booked by phone for now (timings not confirmed). */
export type Service = {
  id: string;
  name: string;
  /** One or two words for small tiles, e.g. "Echo". */
  short: string;
  description: string;
  /** Who runs it, e.g. "Dr. Haneef". */
  lead: string | null;
};

export const services: Service[] = [
  {
    id: "ultrasound",
    short: "Ultrasound",
    name: "Ultrasound",
    description: "Scans and reports, in the clinic.",
    lead: "Dr. Haneef",
  },
  {
    id: "echo",
    short: "Echo",
    name: "Echo and cardiac imaging",
    description: "Heart scans, in the clinic.",
    lead: "Dr. Adil Lankar",
  },
  {
    id: "lab",
    short: "Lab",
    name: "Diagnostic lab",
    description: "Blood tests and lab reports.",
    lead: "Musadiq",
  },
  {
    id: "pharmacy",
    short: "Pharmacy",
    name: "In-house pharmacy",
    description: "Get your prescribed medicines before you leave.",
    lead: null,
  },
];

export const categories: { id: DoctorCategory; label: string }[] = [
  { id: "skin", label: "Skin" },
  { id: "mind", label: "Mind" },
  { id: "general", label: "General" },
  { id: "brain", label: "Brain & spine" },
];

/** True for a speciality id like "skin", e.g. from /doctors?type=skin. */
export const isCategory = (v: unknown): v is DoctorCategory => categories.some((c) => c.id === v);

export const doctors: Doctor[] = [
  {
    id: "mubashir",
    name: "Dr. Mubashir",
    speciality: "Dermatologist",
    category: "skin",
    categoryLabel: "Skin, hair and nails",
    degree: "MD",
    experienceYears: 10,
    registrationNo: null, // TODO: get from the doctor
    opd: [{ day: 0, start: "08:00", end: "13:00" }],
    slotMinutes: 20,
    concerns: ["Acne", "Hair fall", "Rashes and itching", "Skin infections", "Dandruff", "Nail problems"],
    photo: null,
  },
  {
    id: "akash",
    name: "Dr. Akash",
    speciality: "Psychiatrist",
    category: "mind",
    categoryLabel: "Mind and mental health",
    degree: "MD",
    experienceYears: 10,
    registrationNo: null, // TODO: get from the doctor
    opd: [
      { day: 3, start: "16:00", end: "20:00" },
      { day: 6, start: "16:00", end: "20:00" },
    ],
    slotMinutes: 20,
    concerns: ["Stress and anxiety", "Low mood", "Sleep problems", "Panic attacks", "Addiction", "Memory problems"],
    photo: null,
  },
  {
    id: "physician",
    name: null, // TODO: name and OPD days from the clinic
    speciality: "General Physician",
    category: "general",
    categoryLabel: "General health",
    degree: "MD",
    experienceYears: null,
    registrationNo: null,
    opd: [],
    slotMinutes: 20,
    concerns: ["Fever and infections", "Blood pressure", "Diabetes", "Thyroid", "Stomach problems", "General check-up"],
    photo: null,
  },
  {
    id: "neurosurgeon",
    name: null, // TODO: name and OPD days from the clinic
    speciality: "Neurosurgeon",
    category: "brain",
    categoryLabel: "Brain, spine and nerves",
    degree: "MS, MCh",
    experienceYears: null,
    registrationNo: null,
    opd: [],
    slotMinutes: 20,
    concerns: ["Slipped disc", "Back or neck pain with numbness", "Head injury", "Spine injury"],
    photo: null,
  },
];
