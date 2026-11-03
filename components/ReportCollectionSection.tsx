import { clinic } from "@/data/clinic";
import { PhoneIcon, ReportIcon, ShieldCheckIcon, WhatsAppIcon } from "@/components/Icons";

export function ReportCollectionSection({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`card relative overflow-hidden rounded-3xl border border-brand-line/80 bg-gradient-to-br from-brand-tint/50 via-white to-brand-tint/30 p-6 sm:p-9 ${className}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
        {/* Left Column: Heading, Value Prop & Steps */}
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-brand">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand/10">
              <ReportIcon className="size-4" />
            </span>
            <span className="eyebrow text-brand">Save a Second Trip • Digital Reports</span>
          </div>

          <h2 className="mt-3 text-2xl sm:text-3xl font-medium tracking-[-0.025em] text-ink font-display">
            Collect your lab &amp; scan reports <em className="text-brand font-italic">on WhatsApp</em>
          </h2>

          <p className="mt-2.5 text-base text-charcoal leading-relaxed">
            Had blood tests, an ultrasound scan, or an echocardiogram done? There is no need to travel
            back to Sopore from Baramulla, Kupwara, or Bandipora just to collect paper sheets. Send your
            Bill or Token number to our desk, and we will dispatch your verified PDF report directly to your chat.
          </p>

          {/* 3 Simple Steps */}
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              {
                num: "1",
                title: "Keep Bill Ready",
                desc: "Have your receipt photo or token number from reception.",
              },
              {
                num: "2",
                title: "Message Reception",
                desc: "Send your details with 1 tap to our official WhatsApp.",
              },
              {
                num: "3",
                title: "Receive PDF",
                desc: "Get your doctor-signed report right on your phone.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-2xl border border-line/70 bg-white/80 p-3.5 backdrop-blur-xs flex flex-col justify-between"
              >
                <div>
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-tint text-xs font-bold text-brand tabular-nums lining-nums">
                    {step.num}
                  </span>
                  <strong className="block mt-2 text-sm font-bold text-ink">
                    {step.title}
                  </strong>
                  <p className="mt-0.5 text-xs text-muted leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy Footnote */}
          <p className="mt-4 flex items-center gap-2 text-xs text-muted">
            <ShieldCheckIcon className="size-3.5 text-brand shrink-0" />
            <span>Reports are released only to the patient or verified receipt holder for patient confidentiality.</span>
          </p>
        </div>

        {/* Right Column: 1-Tap Actions */}
        <div className="flex flex-col justify-center gap-3 shrink-0 lg:w-72 lg:border-l lg:border-line/70 lg:pl-8">
          <span className="text-xs font-bold uppercase tracking-wider text-muted hidden lg:block">
            Direct Report Desk
          </span>

          <a
            href={clinic.reportRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 text-sm sm:text-base font-bold text-white shadow-subtle hover:bg-[#20ba59] active:translate-y-0.5 transition-all text-center"
          >
            <WhatsAppIcon className="size-5 shrink-0" />
            <span>Request on WhatsApp</span>
          </a>

          <a
            href={`tel:${clinic.phone}`}
            className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white px-5 text-sm font-bold text-ink hover:border-brand hover:text-brand transition-colors text-center"
          >
            <PhoneIcon className="size-4 text-brand group-hover:scale-110 transition-transform" />
            <span>Call Lab: {clinic.phoneDisplay}</span>
          </a>

          <div className="rounded-xl bg-ground/80 p-3 border border-line/50 text-center">
            <span className="block text-[11px] font-semibold text-muted">
              Report Desk Hours
            </span>
            <span className="block text-xs font-bold text-ink mt-0.5 tabular-nums lining-nums">
              7:00 am – 8:00 pm (Daily)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

