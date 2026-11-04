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
    question: "Do I need an account to book?",
    answer:
      `No. Choose a doctor, a day and a time, add your name and mobile number, and tap Confirm Appointment. Your slot is locked instantly, you get a digital token slip on screen${clinic.whatsappAutoConfirm ? ", and a confirmation is sent to your WhatsApp" : " (take a screenshot)"}. Lost the slip? Use Find My Token with your mobile number.`,
  },
  {
    question: "Will anyone know why I'm visiting?",
    answer:
      `The website only asks for your name, mobile number, and optional village/area, never the reason for your visit. Your booking is kept in the clinic's register only to hold your slot.${clinic.whatsappAutoConfirm ? " The WhatsApp confirmation names your doctor, never the speciality, but like any WhatsApp message it stays in your chat, so delete it if others use your phone." : ""}`,
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
