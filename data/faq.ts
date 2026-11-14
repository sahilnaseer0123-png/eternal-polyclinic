// FAQ answers. Clinic facts come from clinic.ts so they never drift apart.

import { clinic, services } from "./clinic";
import { formatProseItem } from "@/lib/schedule";

export type Faq = { question: string; answer: string };

const serviceList = services
  .map((s) => formatProseItem(s.name))
  .join(", ")
  .replace(/, ([^,]*)$/, " and $1");

export const faqs: Faq[] = [
  {
    question: "Which doctor should I see?",
    answer: `On the Doctors page, search or tap a speciality (Skin, Mind, Brain & spine, Urology, Children, Women's health, Heart). If you're not sure, call ${clinic.phoneDisplay} and reception will guide you.`,
  },
  {
    question: "What if it's an emergency?",
    answer: `Don't book online. ${clinic.name} is not an emergency service. Go to ${clinic.emergency.place}, or call ${clinic.emergency.phone}.`,
  },
  {
    question: "How do I enquire about an OPD consultation?",
    answer:
      `Online booking is currently paused. Browse the Doctors page or Home schedule to see which specialist sits on which day, then message reception on WhatsApp (${clinic.whatsappDisplay}) or call ${clinic.phoneDisplay} during clinic hours.`,
  },
  {
    question: "What privacy do I have when contacting the clinic?",
    answer:
      "The website never collects your medical reason for visiting and does not store public booking profiles. When contacting reception by phone or WhatsApp, your enquiry stays private between you and the clinic desk.",
  },
  {
    question: "How much does a consultation cost?",
    answer: `Consultation fees depend on the specialist doctor. There is zero clinic registration charge. Call ${clinic.phoneDisplay} to check the fee for any doctor.`,
  },
  {
    question: "Can I get scans and tests done here?",
    answer: `Yes. The clinic has ${serviceList} in-house. Call ${clinic.phoneDisplay} to ask about timings.`,
  },
  {
    question: "Can I collect my lab or scan reports on WhatsApp?",
    answer: `Yes! There is no need to travel back to Sopore just to collect paper sheets. Message our Lab Technician (Musadiq Ahmad, ${clinic.labTechPhoneDisplay}) on WhatsApp with your Patient Name and Receipt or Token number, and your signed digital PDF report will be sent directly to your chat once ready.`,
  },
  {
    question: "What should I bring?",
    answer: "Old prescriptions, any test reports, and a list of the medicines you take now.",
  },
  {
    question: "Where exactly is the clinic?",
    answer: `${clinic.address}, in the ${clinic.location.name} building. The Contact page has a map and directions. If you can't find it, call ${clinic.phoneDisplay}.`,
  },
];
