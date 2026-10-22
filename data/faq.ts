// FAQ answers. Clinic facts come from clinic.ts so they never drift apart.

import { clinic, services } from "./clinic";

export type Faq = { question: string; answer: string };

const serviceList = services.map((s) => s.name.toLowerCase()).join(", ").replace(/, ([^,]*)$/, " and $1");

export const faqs: Faq[] = [
  {
    question: "Which doctor should I see?",
    answer: `Use the filter under "Our doctors" to pick by problem area. If you're not sure, call ${clinic.phoneDisplay} and reception will guide you.`,
  },
  {
    question: "Do I need an account to book?",
    answer:
      "No. Choose a doctor, a day and a time, add your name and mobile number, and send the request on WhatsApp. Reception calls you to confirm the slot.",
  },
  {
    question: "Will anyone know why I'm visiting?",
    answer:
      "The website only asks for your name and number. The booking message names your doctor, never the speciality or the reason for your visit, and nothing is saved on your phone.",
  },
  {
    question: "How much does a consultation cost?",
    answer: `₹${clinic.consultationFee} per consultation, for every doctor.`,
  },
  {
    question: "Can I get scans and tests done here?",
    answer: `Yes. The clinic has ${serviceList} in-house. Call ${clinic.phoneDisplay} to ask about timings.`,
  },
  {
    question: "What should I bring?",
    answer: "Old prescriptions, any test reports, and a list of the medicines you take now.",
  },
  {
    question: "Where exactly is the clinic?",
    answer: `${clinic.address}. If you can't find it, call ${clinic.phoneDisplay}.`,
  },
];
