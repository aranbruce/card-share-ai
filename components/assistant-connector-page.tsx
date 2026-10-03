import Link from "next/link"
import { ArrowUpRight, Check } from "lucide-react"
import { AssistantChatDemo } from "@/components/assistant-chat-demo"
import { ConnectorUrlCopy } from "@/components/connector-url-copy"
import {
  ASSISTANT_CAPABILITIES,
  ASSISTANT_PAGES,
  ASSISTANT_PROMPTS,
  CONNECTOR_URL,
  loomEmbedUrl,
  type AssistantPage,
} from "@/lib/assistant-pages"

const sectionTitle = "text-2xl font-semibold tracking-[-0.03em]"
const link = "text-foreground underline underline-offset-4"

function OtherAssistant({ page }: { page: AssistantPage }) {
  const other = Object.values(ASSISTANT_PAGES).find((p) => p.id !== page.id)
  if (!other) return null
  return (
    <p className="text-sm text-muted-foreground">
      Using {other.name} instead?{" "}
      <Link href={other.path} className={link}>
        Add CardShare.ai to {other.name}
      </Link>
    </p>
  )
}

/** A page on adding the CardShare.ai connector to an AI assistant (/claude, /chatgpt). */
export function AssistantConnectorPage({ page }: { page: AssistantPage }) {
  const loom = loomEmbedUrl(page.loomUrl)

  return (
    <main className="mx-auto flex max-w-5xl flex-col items-center gap-20 px-6 py-24">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-3xl leading-[0.95] font-semibold tracking-[-0.04em] text-balance sm:text-4xl md:text-5xl">
            Use CardShare.ai in <span className="text-brand">{page.name}</span>
          </h1>
          <p className="max-w-lg text-pretty text-muted-foreground">
            {page.lede}
          </p>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <a
            href="#set-up"
            className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Set it up
          </a>
          <p className="text-xs text-muted-foreground">{page.note}</p>
        </div>
      </div>

      <section aria-label="How it works" className="w-full">
        {loom ? (
          <div className="mb-10 aspect-video w-full overflow-hidden rounded-2xl border border-border bg-secondary">
            <iframe
              src={loom}
              title={`Using CardShare.ai in ${page.name}`}
              allowFullScreen
              loading="lazy"
              className="size-full"
            />
          </div>
        ) : null}
        <AssistantChatDemo assistant={page.name} />
      </section>

      <section id="set-up" className="w-full max-w-3xl scroll-mt-24">
        <h2 className={sectionTitle}>Set it up</h2>
        <ol className="mt-6 grid gap-3">
          {page.steps.map((s, i) => (
            <li
              key={s.title}
              className="flex gap-4 rounded-2xl border border-border bg-card px-5 py-4.5"
            >
              <span className="mt-px shrink-0 font-mono text-sm text-brand">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-[15px] font-semibold tracking-[-0.015em]">
                  {s.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-2xl bg-secondary p-5">
          <p className="mb-2.5 text-sm font-medium">Connector URL</p>
          <ConnectorUrlCopy url={CONNECTOR_URL} />
        </div>
        <a
          href={page.cta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
        >
          {page.cta.label}
          <ArrowUpRight className="size-4" />
        </a>
      </section>

      <section className="w-full max-w-3xl">
        <h2 className={sectionTitle}>Things to ask</h2>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {ASSISTANT_PROMPTS.map((prompt) => (
            <li
              key={prompt}
              className="rounded-2xl rounded-br-md border border-border bg-card px-4 py-2.5 text-sm"
            >
              &ldquo;{prompt}&rdquo;
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full max-w-3xl">
        <h2 className={sectionTitle}>What {page.name} can do</h2>
        <dl className="mt-6 grid gap-3 sm:grid-cols-2">
          {ASSISTANT_CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <dt className="text-[15px] font-semibold tracking-[-0.015em]">
                {c.title}
              </dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {c.desc.replaceAll("{name}", page.name)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="w-full max-w-3xl rounded-3xl bg-secondary px-6 py-7 sm:p-8">
        <h2 className={sectionTitle}>Good to know</h2>
        <ul className="mt-4 divide-y divide-border border-b border-border">
          {page.goodToKnow.map((item) => (
            <li key={item} className="flex items-start gap-4 py-4 text-sm">
              <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="w-full max-w-3xl">
        <h2 className={sectionTitle}>If something goes wrong</h2>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {page.troubleshooting.map((t) => (
            <details key={t.q} className="group py-4">
              <summary className="cursor-pointer list-none text-[15px] font-semibold tracking-[-0.015em] marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {t.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t.a}
              </p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Still stuck? Email{" "}
          <a href="mailto:cardshareai@gmail.com" className={link}>
            cardshareai@gmail.com
          </a>
          . Read our{" "}
          <Link href="/privacy" className={link}>
            privacy policy
          </Link>{" "}
          and the{" "}
          <Link href="/subprocessors" className={link}>
            services we use
          </Link>
          .
        </p>
      </section>

      <OtherAssistant page={page} />
    </main>
  )
}
