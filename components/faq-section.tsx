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

/**
 * An FAQ section of expandable questions, with matching FAQPage structured data. `split` puts
 * the heading in a left column beside the questions on wide screens.
 */
export function FaqSection({
  eyebrow,
  title,
  faqs,
  split = false,
}: {
  eyebrow: string
  title: string
  faqs: readonly Faq[]
  split?: boolean
}) {
  return (
    <section id="faq" className="border-t border-border">
      <JsonLd data={faqPageJsonLd(faqs)} />
      <div
        className={
          split
            ? "mx-auto grid max-w-360 grid-cols-1 gap-x-18 px-6 py-20 md:px-15 md:py-22 lg:grid-cols-[minmax(0,480px)_minmax(0,1fr)]"
            : "mx-auto max-w-360 px-6 py-20 md:px-15"
        }
      >
        <div>
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            {eyebrow}
          </p>
          <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            {title}
          </h2>
        </div>
        <div
          className={
            split
              ? "mt-10 border-t border-border lg:mt-0 lg:self-start"
              : "mt-10"
          }
        >
          {faqs.map((faq) => (
            <details key={faq.q} className="group border-b border-border py-5">
              <summary
                className={`flex cursor-pointer list-none items-center justify-between gap-6 font-medium tracking-[-0.015em] ${split ? "text-lg" : "text-base"}`}
              >
                {faq.q}
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card transition-transform group-open:rotate-45">
                  <PlusIcon />
                </span>
              </summary>
              <p
                className={`mt-3 leading-relaxed text-muted-foreground ${split ? "max-w-170 text-base" : "text-sm"}`}
              >
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
