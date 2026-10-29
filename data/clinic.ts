// Every fact about the clinic lives in this one file.
// Change it here and the whole site updates. Never hard-code these anywhere else.

/** 0 = Sunday, 1 = Monday ... 6 = Saturday (same as JavaScript's getDay()). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One OPD sitting. Times are 24-hour "HH:mm" in clinic time (Asia/Kolkata). */
export type OpdSession = {
  day: Weekday;
  start: string;
  end: string;
  recurrence?: "weekly" | "first-of-month" | "alternate";
  note?: string;
};

export type DoctorCategory =
  | "skin"
  | "mind"
  | "brain"
  | "urology"
  | "children"
  | "women"
  | "heart"
  | "general";

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
   * "What brings you in?" and search, not a promise of treatment.
   */
  concerns: string[];
  /** Optional: signs that need emergency care instead of a booking, shown on the doctor's page. */
  emergencyHint?: string;
  /** Title, hospital post or academic affiliation. */
  designation?: string;
  /** Key honors, fellowships or former consultant positions. */
  credentials?: string;
  /** Specialized procedures or diagnostic facilities offered by this doctor. */
  facilities?: string[];
  /** When OPD days aren't fixed weekly (e.g. 4 days/week or by appointment). */
  availability?: string;
};

export const clinic = {
  name: "Eternal Polyclinic",
  /** The live address. Cloudflare Pages project "eternal-polyclinic". */
  siteUrl: "https://eternal-polyclinic.pages.dev",
  founder: "Naseer Ah Lone",
  address: "1st Floor, Lone Complex, Opposite SDH Hospital, Sopore",
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

/** In-house tests and services. Booked by phone for now (timings confirmed with reception). */
export type Service = {
  id: string;
  name: string;
  /** One or two words for small tiles, e.g. "Echo". */
  short: string;
  description: string;
  /** Who runs it. */
  lead: string | null;
};

export const services: Service[] = [
  {
    id: "ultrasound",
    short: "Ultrasound",
    name: "Ultrasound (USG)",
    description: "Scans and reports in the clinic. Available 4 days a week.",
    lead: "Dr. M. Hanief Tantray (MD Radiologist)",
  },
  {
    id: "pediatric-echo",
    short: "Pediatric Echo",
    name: "Fetal & Pediatric Echocardiography",
    description: "Fetal echo and pediatric heart scans performed directly by the specialist.",
    lead: "Dr. Audil Mohmad Lanker (Pediatric Cardiologist)",
  },
  {
    id: "adult-echo",
    short: "Adult Echo",
    name: "Adult Echocardiography",
    description: "Heart scans and echocardiography assessments.",
    lead: "Dr. Mustafa Bashir (DM Cardiology)",
  },
  {
    id: "uroflowmetry",
    short: "Uroflowmetry",
    name: "Uroflowmetry & Urodynamics",
    description: "Specialized urinary flow and bladder diagnostic studies.",
    lead: "Dr. Imtiyaz Ahmad Sofi (Urologist)",
  },
  {
    id: "lab",
    short: "Lab",
    name: "Diagnostic lab",
    description: "Blood tests and pathology reports.",
    lead: "Musadiq Ahmad (Lab Technician)",
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
  { id: "skin", label: "Skin & hair" },
  { id: "mind", label: "Mind" },
  { id: "brain", label: "Brain & spine" },
  { id: "urology", label: "Urology & kidney" },
  { id: "children", label: "Children" },
  { id: "women", label: "Women's health" },
  { id: "heart", label: "Heart" },
  { id: "general", label: "General & scans" },
];

/** True for a speciality id like "skin", e.g. from /doctors?type=skin. */
export const isCategory = (v: unknown): v is DoctorCategory => categories.some((c) => c.id === v);

export const doctors: Doctor[] = [
  {
    id: "akash",
    name: "Dr. Akash Yousuf Khan",
    speciality: "Consultant Neuropsychiatrist",
    category: "mind",
    categoryLabel: "Mind & neuropsychiatry",
    degree: "MD",
    experienceYears: 20,
    registrationNo: null,
    opd: [
      { day: 4, start: "09:00", end: "14:00" },
      { day: 6, start: "09:00", end: "17:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Stress and anxiety",
      "Depression and low mood",
      "Sleep problems",
      "Panic attacks",
      "OCD",
      "Bipolar disorder",
      "Addiction (alcohol, drugs, smoking)",
      "Memory loss & neuropsychiatric conditions",
    ],
    photo: null,
  },
  {
    id: "basharat",
    name: "Dr. Mir Basharat Ahmad Kanth",
    speciality: "Neurosurgeon",
    category: "brain",
    categoryLabel: "Brain, spine & nerves",
    degree: "MBBS, MS, MCh (SKIMS Soura)",
    experienceYears: null,
    registrationNo: null,
    credentials: "Member, Neuro Surgical Society of India",
    facilities: [
      "Microscopic disc surgery",
      "Endoscopic disc surgery",
      "Spine and brain tumors",
      "Spine and brain trauma",
    ],
    opd: [
      { day: 3, start: "07:00", end: "14:00", recurrence: "first-of-month", note: "1st Wednesday of every month" },
    ],
    slotMinutes: 20,
    concerns: [
      "Brain and spine conditions",
      "Slipped disc & disc prolapse",
      "Microscopic and endoscopic disc surgery",
      "Spine and brain tumors",
      "Spine and brain trauma",
      "Severe back or neck pain with numbness",
      "Sciatica (radiating leg pain)",
    ],
    emergencyHint:
      "A head injury with fainting, vomiting or confusion, a sudden severe headache, or new weakness or numbness is an emergency.",
    photo: null,
  },
  {
    id: "imtiyaz",
    name: "Dr. Imtiyaz Ahmad Sofi",
    speciality: "Urologist, Andrologist & Renal Transplant Surgeon",
    category: "urology",
    categoryLabel: "Urology, kidney & men's health",
    degree: "MBBS, MS, DNB (Urology)",
    experienceYears: 10,
    registrationNo: null,
    designation: "First Robotic Surgeon of Kashmir",
    credentials: "Former Consultant Urologist, Fortis Hospital, Bangalore",
    facilities: [
      "Uroflowmetry",
      "RIRS (Retrograde Intrarenal Surgery)",
      "Vascular access in CKD patients",
      "Laser enucleation of prostate",
      "BMG urethroplasty",
      "Kidney transplant consultation",
      "Urodynamic studies",
    ],
    opd: [
      { day: 0, start: "10:00", end: "13:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Kidney stones & ureteric stones",
      "Prostate enlargement (BPH) & laser treatment",
      "Uroflowmetry & urodynamic testing",
      "Urinary tract infections (UTI)",
      "Blood in urine (hematuria)",
      "Vascular access in CKD patients",
      "Kidney transplant consultation",
      "Male fertility & andrology",
    ],
    photo: null,
  },
  {
    id: "audil",
    name: "Dr. Audil Mohmad Lanker",
    speciality: "Pediatric Cardiologist",
    category: "heart",
    categoryLabel: "Pediatric & fetal cardiology",
    degree: "MD, Fellowship in Pediatric Cardiology",
    experienceYears: 15,
    registrationNo: null,
    facilities: [
      "Fetal echocardiography",
      "Pediatric echocardiography",
      "Echocardiograms performed directly by the doctor",
    ],
    opd: [
      { day: 5, start: "09:00", end: "12:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Fetal echocardiography (pregnancy heart scans)",
      "Pediatric echocardiography",
      "Congenital heart defects (hole in heart)",
      "Heart murmurs in children",
      "Blue baby / cyanosis (bluish discoloration of lips)",
      "Chest pain or palpitations in children",
      "Breathlessness or poor feeding in infants",
    ],
    photo: null,
  },
  {
    id: "mustafa",
    name: "Dr. Mustafa Bashir",
    speciality: "Adult Cardiologist",
    category: "heart",
    categoryLabel: "Heart & adult cardiology",
    degree: "DM (Cardiology)",
    experienceYears: null,
    registrationNo: null,
    designation: "Consultant Cardiologist",
    facilities: [
      "Adult Echocardiography",
      "Cardiac evaluations & ECG",
      "Hypertension & heart disease management",
    ],
    availability:
      "Adult Echocardiography and cardiology consultations by prior appointment. Call reception at 97977 96909 to confirm timing and book.",
    opd: [],
    slotMinutes: 20,
    concerns: [
      "Chest pain and angina",
      "High blood pressure (hypertension)",
      "Heart attack (post-MI recovery)",
      "Palpitations & irregular heartbeat",
      "Breathlessness on exertion",
      "Heart failure & cardiac weakness",
      "Cholesterol & lipid disorders",
      "Adult echocardiography (heart scans)",
    ],
    photo: null,
  },
  {
    id: "amjad",
    name: "Dr. Amjad Ali",
    speciality: "Dermatologist",
    category: "skin",
    categoryLabel: "Skin, hair & infections",
    degree: "MBBS (SKIMS Soura), PG (Dermatology) SMHS, DDVD, M.I.A.D.V.I. (India)",
    experienceYears: null,
    registrationNo: null,
    designation: "Specialist in skin conditions, sexually transmitted diseases and leprosy",
    opd: [
      { day: 3, start: "16:00", end: "20:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Skin conditions & stubborn allergies",
      "Sexually transmitted diseases (STDs)",
      "Leprosy diagnosis & management",
      "Acne and facial pigmentation",
      "Psoriasis, eczema & dermatitis",
      "Fungal, bacterial and viral skin infections",
      "Hair fall, dandruff & scalp problems",
    ],
    photo: null,
  },
  {
    id: "mudasir",
    name: "Dr. Mudasir Hamid Buch",
    speciality: "Pediatric and Neonatal Surgeon",
    category: "children",
    categoryLabel: "Pediatric & neonatal surgery",
    degree: "MS General & Minimal Access Surgery, MCh Pediatric & Neonatal Surgery",
    experienceYears: 12,
    registrationNo: null,
    opd: [
      { day: 0, start: "10:00", end: "13:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Pediatric surgical conditions",
      "Neonatal (newborn) surgical problems",
      "Hernia and hydrocele in children",
      "Undescended testis",
      "Appendicitis in children",
      "Congenital surgical malformations",
      "Minimal access & laparoscopic surgery in children",
    ],
    photo: null,
  },
  {
    id: "suhail",
    name: "Dr. Suhail Naik",
    speciality: "Pediatrician and Neonatologist",
    category: "children",
    categoryLabel: "Pediatric care & vaccination",
    degree: "MD Pediatrics",
    experienceYears: null,
    registrationNo: null,
    designation: "Associate Professor, Children Hospital Bemina",
    facilities: [
      "Pediatric care & regular child checkups",
      "Newborn & neonatal care",
      "Complete child vaccinations",
    ],
    opd: [
      { day: 0, start: "09:00", end: "15:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Child fever and acute infections",
      "Vaccinations and immunization schedules",
      "Newborn care and infant health",
      "Child growth, nutrition and weight issues",
      "Childhood asthma, cough and wheezing",
      "Vomiting, diarrhea and dehydration in kids",
      "Developmental delay & milestones",
    ],
    photo: null,
  },
  {
    id: "hilal",
    name: "Dr. Hilal Ahmad Ganaie",
    speciality: "Neurologist / Interventional Neurologist",
    category: "brain",
    categoryLabel: "Brain, nerves & neurology",
    degree: "MD Medicine (SKIMS Soura), DM Neurology (WBUHS), FINR, FINS",
    experienceYears: null,
    registrationNo: null,
    designation: "Associate Director – Neurology",
    facilities: [
      "Interventional neurology",
      "Stroke management",
      "Epilepsy & seizure evaluation",
    ],
    opd: [
      { day: 5, start: "16:00", end: "20:00", recurrence: "alternate", note: "Alternate Fridays after 4:00 PM" },
    ],
    slotMinutes: 20,
    concerns: [
      "Frequent headaches and chronic migraine",
      "Stroke and transient ischemic attack (mini-stroke)",
      "Epilepsy and seizures",
      "Parkinson’s disease, tremors & stiffness",
      "Meningitis and brain infections",
      "Nerve pain, neuropathy, numbness & tingling",
      "Memory disorders and dementia",
    ],
    emergencyHint:
      "Sudden weakness or numbness on one side of the face or body, difficulty speaking, or a sudden thunderclap headache requires immediate emergency care.",
    photo: null,
  },
  {
    id: "rakhshanda",
    name: "Dr. Rakhshanda Rashid",
    speciality: "Gynaecologist",
    category: "women",
    categoryLabel: "Women's health & gynaecology",
    degree: "Former Registrar, LD Hospital",
    experienceYears: 20,
    registrationNo: null,
    opd: [
      { day: 0, start: "10:30", end: "14:30" },
    ],
    slotMinutes: 20,
    concerns: [
      "Pregnancy care and antenatal checkups",
      "Irregular periods & heavy menstrual bleeding",
      "PCOS / PCOD management",
      "Infertility & conception guidance",
      "Pelvic pain, cysts and fibroids",
      "White discharge and vaginal infections",
      "Menopause symptoms & hormonal balance",
    ],
    photo: null,
  },
  {
    id: "mubashir",
    name: "Dr. Syed Mubashir",
    speciality: "Dermatologist",
    category: "skin",
    categoryLabel: "Skin, hair and dermatosurgery",
    degree: "MBBS, MD, FRGUHS (Dermatosurgery), Postdoctoral Fellowship in Dermatosurgery & Hair Transplant",
    experienceYears: 10,
    registrationNo: null,
    designation: "HOD, Department of Dermatology, Kashmir Medical College",
    facilities: [
      "Dermatosurgery",
      "Hair transplant consultation",
      "Advanced skin laser and aesthetic procedures",
    ],
    opd: [
      { day: 0, start: "10:30", end: "14:00" },
    ],
    slotMinutes: 20,
    concerns: [
      "Acne & deep pimple scars",
      "Hair fall, thinning & hair transplant consultation",
      "Rashes, hives and severe itching",
      "Eczema, psoriasis and vitiligo",
      "Fungal, bacterial and skin infections",
      "Facial pigmentation, melasma and dark spots",
      "Warts, skin tags, moles and cysts",
      "Nail problems & scalp conditions",
    ],
    photo: null,
  },
  {
    id: "hanief",
    name: "Dr. M. Hanief Tantray",
    speciality: "Radiologist",
    category: "general",
    categoryLabel: "Ultrasound & radiology",
    degree: "MD (Radiology)",
    experienceYears: null,
    registrationNo: null,
    designation: "Consultant Radiologist",
    availability:
      "Ultrasound (USG) available 4 days a week. Call reception at 97977 96909 to confirm today's scan timings and book a slot.",
    facilities: [
      "Ultrasound (USG) available 4 days a week",
      "Whole abdomen & pelvic ultrasound",
      "Obstetric & pregnancy scans",
      "KUB (Kidney, Ureter, Bladder) scans",
      "Neck & thyroid scans",
    ],
    opd: [],
    slotMinutes: 20,
    concerns: [
      "Abdominal pain & whole abdomen ultrasound",
      "Pelvic & pregnancy scans (fetal wellbeing)",
      "Kidney stones & urinary tract scans (KUB)",
      "Gallbladder & liver ultrasound",
      "Thyroid and neck swelling scans",
      "Scrotal & testicular ultrasound",
      "Soft tissue and musculoskeletal scans",
    ],
    photo: null,
  },
];
