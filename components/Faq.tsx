// FAQ accordion built on native <details>/<summary>: accessible, keyboard navigable, zero JS layout shift.
// Styled according to Swiss Medical Editorial design tokens.

import { faqs } from "@/data/faq";

export function Faq() {
  return (
    <div className="card divide-y divide-line overflow-hidden rounded-3xl">
      {faqs.map((faq, i) => (
        <details
          key={faq.question}
          className="group px-5 sm:px-7 transition-colors open:bg-ground/40"
          open={i === 0}
        >
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4.5 text-lg sm:text-xl font-medium tracking-tight text-ink hover:text-brand transition-colors font-display [&::-webkit-details-marker]:hidden">
            <span>{faq.question}</span>
            <span
              aria-hidden="true"
              className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-sand text-sm font-bold text-muted transition-transform group-open:rotate-45 group-open:bg-brand-tint group-open:text-brand"
            >
              +
            </span>
          </summary>
          <p className="pb-5 pt-1 text-base leading-relaxed text-charcoal pr-8">
            {faq.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
