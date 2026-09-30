import { JsonLd } from "@/components/json-ld"
import { faqPageJsonLd } from "@/lib/structured-data"

export type Faq = { q: string; a: string }

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      className="size-3"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

/** An FAQ section of expandable questions, with matching FAQPage structured data. */
export function FaqSection({
  eyebrow,
  title,
  faqs,
}: {
  eyebrow: string
  title: string
  faqs: readonly Faq[]
}) {
  return (
    <section id="faq" className="border-t border-border">
      <JsonLd data={faqPageJsonLd(faqs)} />
      <div className="mx-auto max-w-360 px-6 py-20 md:px-15">
        <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
          {title}
        </h2>
        <div className="mt-10">
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-border py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-base font-medium tracking-[-0.015em]">
                {faq.q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border transition-transform group-open:rotate-45 group-open:border-foreground group-open:bg-foreground group-open:text-background">
                  <PlusIcon />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
