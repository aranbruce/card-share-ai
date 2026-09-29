import { cn } from "@/lib/utils"

/** Illustrative Slack conversation showing /cardshareai creating a card. */
export function SlackConversationMockup({
  appHostname,
  className,
}: {
  appHostname: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card text-left shadow-[0_40px_80px_-40px_rgba(17,17,16,0.14)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 font-mono text-[11px] tracking-widest text-muted-foreground/85 uppercase">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
          <div className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>
        # general
      </div>
      <div className="flex flex-col gap-0 p-4 text-sm">
        <div className="flex items-start gap-3 rounded-lg px-2 py-1.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">
            A
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">Aran</span>
              <span className="text-xs text-muted-foreground">10:42 AM</span>
            </div>
            <p className="mt-0.5 font-mono text-muted-foreground">
              /cardshareai
            </p>
          </div>
        </div>

        <div className="mt-1 flex items-start gap-3 rounded-lg px-2 py-1.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
            C
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">CardShare.ai</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                APP
              </span>
              <span className="text-xs text-muted-foreground">10:42 AM</span>
            </div>
            <p className="mt-0.5 text-muted-foreground">
              ✨ Creating a card for{" "}
              <span className="font-medium text-foreground">Emily</span>…
            </p>
          </div>
        </div>

        <div className="mt-1 flex items-start gap-3 rounded-lg px-2 py-1.5">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">
            C
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">CardShare.ai</span>
              <span className="rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                APP
              </span>
              <span className="text-xs text-muted-foreground">10:43 AM</span>
            </div>
            <p className="mt-0.5 text-muted-foreground">
              <span className="font-medium text-foreground">@Aran</span> Your
              card for Emily is ready!
            </p>
            <div className="mt-2 rounded-lg border border-border bg-background p-3">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-linear-to-br from-rose-300 to-pink-500" />
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    Happy Birthday, Emily!
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {appHostname}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
