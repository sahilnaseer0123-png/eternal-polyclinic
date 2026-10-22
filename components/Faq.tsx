// FAQ accordion built on native <details>/<summary>: works with keyboard and screen readers, no JavaScript needed.

import { faqs } from "@/data/faq";

export function Faq() {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {faqs.map((faq, i) => (
        <details key={faq.question} className="group px-5 sm:px-6" open={i === 0}>
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span aria-hidden="true" className="text-2xl font-normal text-muted transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="pb-5 text-ink/90">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
