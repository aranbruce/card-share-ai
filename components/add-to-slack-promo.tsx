import { cn } from "@/lib/utils"

/**
 * The Add to Slack button on a card with what happens next. `href` is the install
 * page from marketing pages, or the OAuth start on the install page itself.
 */
export function AddToSlackPromo({
  href,
  className,
}: {
  href: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-col items-start gap-4 rounded-3xl border border-border bg-card p-5 text-left shadow-[0_24px_48px_-28px_rgba(255,90,74,0.35),0_2px_6px_rgba(17,17,16,0.03)] sm:flex-row sm:items-center sm:gap-6",
        className,
      )}
    >
      <a href={href} className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- Slack's official button */}
        <img
          alt="Add to Slack"
          width={153}
          height={44}
          src="https://platform.slack-edge.com/img/add_to_slack@2x.png"
          className="h-11 w-auto"
        />
      </a>
      <div className="flex flex-col gap-1 text-[15px] leading-snug">
        <p className="font-semibold tracking-[-0.015em]">
          Free · Set up in about 2 minutes
        </p>
        <p className="text-muted-foreground">
          Then type{" "}
          <code className="font-mono text-[0.92em] text-brand">
            /cardshareai
          </code>{" "}
          in any channel
        </p>
      </div>
    </div>
  )
}
