import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SlackConversationMockup } from "@/components/slack-conversation-mockup"

const FEATURES = [
  {
    n: "01",
    title: "One link, everyone signs",
    desc: "Each person places their note anywhere on the page. Drag, resize, rotate, add a GIF",
  },
  {
    n: "02",
    title: "AI drafts first, you edit",
    desc: "Upload a photo or let AI generate the cover. Regenerate any line, any time. The AI has a light touch. Never saccharine",
  },
  {
    n: "03",
    title: "Delivered as one",
    desc: "Every note, every signature, every GIF. All combined into a single, beautiful card",
  },
]

export function HomeMarketingSections({
  appHostname,
}: {
  appHostname: string
}) {
  return (
    <>
      <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
            Built for group cards
          </p>
          <h2 className="mt-4 max-w-3xl text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Group cards used to take ten follow-ups. Now it takes one link
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.n}>
                <div className="font-mono text-sm text-muted-foreground/60">
                  {f.n}
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.015em]">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-15">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="font-mono text-[11px] tracking-[0.15em] text-brand uppercase">
                Works with Slack
              </p>
              <h2 className="mt-4 text-3xl leading-[1.02] font-semibold tracking-[-0.03em] md:text-4xl">
                Create cards without leaving Slack
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
                Install the CardShare.ai bot and send a personalised card in
                seconds, directly from any channel or DM
              </p>
              <ol className="mt-8 flex flex-col gap-5">
                {[
                  {
                    n: "01",
                    title: "Type /cardshareai in any channel",
                    desc: "A form opens inline. Choose the card type, add the recipient's name, pick a tone, and drop in any context",
                  },
                  {
                    n: "02",
                    title: "Hit Create",
                    desc: "AI generates a personalised headline and cover image. No prompting required",
                  },
                  {
                    n: "03",
                    title: "Card link lands in the channel",
                    desc: "Share it with the team so everyone can sign, or send it straight to the recipient",
                  },
                ].map((s) => (
                  <li key={s.n} className="flex gap-4">
                    <span className="mt-0.5 shrink-0 font-mono text-sm text-muted-foreground/60">
                      {s.n}
                    </span>
                    <div>
                      <p className="text-sm font-semibold tracking-[-0.015em]">
                        {s.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {s.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <Link href="/slack/install">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt="Add to Slack"
                    height="40"
                    width="139"
                    src="https://platform.slack-edge.com/img/add_to_slack.png"
                    srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x"
                  />
                </Link>
              </div>
            </div>

            <SlackConversationMockup
              appHostname={appHostname}
              className="hidden lg:block"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/50">
        <div className="mx-auto max-w-4xl px-6 py-24 text-center md:px-15">
          <h2 className="text-3xl font-semibold tracking-[-0.03em] md:text-4xl lg:text-5xl">
            Start the card. We&apos;ll handle the rest
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            No account needed. Just type one sentence and go
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/create">
                Start a card
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Free
                </span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
