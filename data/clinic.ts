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
   * "What brings you in?" and search, not a promise of treatment. Checked 23 Oct 2026 against hospital and
   * medical references (Healthline, Cleveland Clinic, Banner Health, Hinduja Hospital). The first two show on the home page.
   */
  concerns: string[];
  /** Optional: signs that need emergency care instead of a booking, shown on the doctor's page. */
  emergencyHint?: string;
};

export const clinic = {
  name: "Eternal Polyclinic",
  /** The live address. Cloudflare Pages project "eternal-polyclinic" (moved from Vercel 23 Oct 2026). */
  siteUrl: "https://eternal-polyclinic.pages.dev",
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
  /** Real photo sent by the clinic (24 Oct 2026). Files in public/photos/, 3:2, at 640 and 1200 px wide. */
  receptionPhoto: {
    src: "/photos/reception",
    alt: "The reception desk at Eternal Polyclinic",
    width: 1200,
    height: 800,
  },
  mapUrl: "https://www.google.com/maps/dir/?api=1&destination=34.2938233,74.455089",
  mapEmbedUrl: "https://maps.google.com/maps?q=34.2938233,74.455089&z=18&output=embed",
  /** Shown wherever patients might book: the clinic is not an emergency service. 112 = India's emergency number.
   *  SDH Hospital's 24-hour emergency department confirmed by the clinic, 23 Oct 2026. */
  emergency: { phone: "112", place: "the emergency department at SDH Hospital, right opposite (open 24 hours)" },
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
    concerns: ["Acne", "Hair fall", "Rashes and itching", "Eczema and psoriasis", "Fungal and skin infections", "Pigmentation and dark spots", "Warts and moles", "Dandruff", "Nail problems"],
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
    concerns: ["Stress and anxiety", "Depression and low mood", "Sleep problems", "Panic attacks", "OCD", "Bipolar disorder", "Addiction (alcohol, drugs, smoking)"],
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
    concerns: ["Fever and infections", "Blood pressure", "Diabetes", "Thyroid", "Cough and chest infections", "Stomach problems", "High cholesterol", "Asthma", "Headaches", "General check-up"],
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
    concerns: ["Slipped disc", "Back or neck pain with numbness", "Sciatica (pain down the leg)", "Pinched nerves", "Brain or spine tumours", "Head or spine injury (after first aid)"],
    emergencyHint:
      "A head injury with fainting, vomiting or confusion, a sudden severe headache, or new weakness or numbness is an emergency.",
    photo: null,
  },
];
