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
  /** Path under /public, or null to show the cartoon avatar. */
  photo: string | null;
  /** Colours for the cartoon avatar used until real photos arrive. */
  avatar: { skin: string; hair: string; beard: boolean };
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
   * The clinic isn't on Google Maps yet, and a search for its name finds a DIFFERENT clinic.
   * So directions and the map point at the landmark hospital opposite, by coordinates.
   * TODO: once the clinic has a Google Business Profile, switch to its own pin.
   */
  landmark: { name: "SDH Sopore (Sub-District Hospital)", lat: 34.292932, lng: 74.4550619 },
  mapUrl: "https://www.google.com/maps/dir/?api=1&destination=34.292932,74.4550619",
  mapEmbedUrl: "https://maps.google.com/maps?q=34.292932,74.4550619&z=17&output=embed",
} as const;

/** In-house tests and services. Booked by phone for now (timings not confirmed). */
export type Service = {
  id: string;
  name: string;
  description: string;
  /** Who runs it, e.g. "Dr. Haneef". */
  lead: string | null;
};

export const services: Service[] = [
  {
    id: "ultrasound",
    name: "Ultrasound",
    description: "Scans and reports, in the clinic.",
    lead: "Dr. Haneef",
  },
  {
    id: "echo",
    name: "Echo and cardiac imaging",
    description: "Heart scans, in the clinic.",
    lead: "Dr. Adil Lankar",
  },
  {
    id: "lab",
    name: "Diagnostic lab",
    description: "Blood tests and lab reports.",
    lead: "Musadiq",
  },
  {
    id: "pharmacy",
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
    photo: null,
    avatar: { skin: "#E8B98F", hair: "#1F2937", beard: true },
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
    photo: null,
    avatar: { skin: "#F2C9A0", hair: "#3F2A1D", beard: false },
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
    photo: null,
    avatar: { skin: "#EFC3A0", hair: "#6B7280", beard: true },
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
    photo: null,
    avatar: { skin: "#D9A47C", hair: "#111827", beard: false },
  },
];
