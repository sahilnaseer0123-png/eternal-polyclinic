// FAQ accordion built on native <details>/<summary>: works with keyboard and screen readers, no JavaScript needed.

import { faqs } from "@/data/faq";

export function Faq() {
  return (
    <div className="card divide-y divide-line/70 overflow-hidden rounded-3xl border border-line/70 shadow-sm">
      {faqs.map((faq, i) => (
        <details key={faq.question} className="group px-5 sm:px-6 transition-colors open:bg-slate-50/50" open={i === 0}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-base sm:text-lg font-bold text-ink hover:text-brand transition-colors [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ground text-xl font-medium text-slate-500 transition-transform group-open:rotate-45 group-open:bg-brand-tint group-open:text-brand">
              +
            </span>
          </summary>
          <p className="pb-5 text-sm sm:text-base leading-relaxed text-slate-700">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
