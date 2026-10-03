import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Bell, Calendar } from "lucide-react"
import { TeamsEnquiryForm } from "@/components/teams-enquiry-form"
import { Button } from "@/components/ui/button"
import { buildPageMetadata } from "@/lib/site-metadata"
import { TEAMS_ENQUIRY_INBOX } from "@/lib/teams-enquiry"
import { cn } from "@/lib/utils"

export const metadata: Metadata = buildPageMetadata({
  title: "CardShare.ai for Teams",
  description:
    "Track your team's birthdays and work anniversaries, get reminded before each one, and send a card the whole team has signed. Get a quote for your team.",
  path: "/teams",
})

const mono = "font-mono uppercase tracking-[0.1em] text-muted-foreground"
const coralText = "text-[#e0402f]"
const sentText = "text-[oklch(0.5_0.12_155)]"

const PEOPLE = {
  priya: { initials: "PS", color: "bg-[oklch(0.62_0.15_25)]" },
  tom: { initials: "TO", color: "bg-[oklch(0.62_0.15_275)]" },
  mei: { initials: "ML", color: "bg-[oklch(0.62_0.15_155)]" },
  jonas: { initials: "JB", color: "bg-[oklch(0.62_0.15_75)]" },
}

const THIS_MONTH = [
  { person: PEOPLE.priya, label: "Priya · Birthday", date: "9 Oct" },
  { person: PEOPLE.tom, label: "Tom · 5 years", date: "14 Oct" },
  { person: PEOPLE.mei, label: "Mei · Farewell", date: "16 Oct" },
  { person: PEOPLE.jonas, label: "Jonas · Birthday", date: "20 Oct" },
]

const DASHBOARD_CARDS = [
  {
    name: "Priya",
    src: "/occasions/birthday.webp",
    status: "8 of 14 signed",
    statusClass: coralText,
  },
  {
    name: "Tom",
    src: "/occasions/work-anniversary.webp",
    status: "Sends Wed 9:00 AM",
  },
  { name: "Mei", src: "/occasions/farewell.webp", status: "Draft" },
]

/** Days 5–25 of October, with the team's occasions highlighted. */
const CALENDAR_DAYS = Array.from({ length: 21 }, (_, i) => i + 5)
const CALENDAR_HIGHLIGHTS: Record<number, string> = {
  9: "bg-brand",
  14: PEOPLE.tom.color,
  16: PEOPLE.mei.color,
  20: PEOPLE.jonas.color,
}

const REMINDERS = [
  {
    title: "Priya's birthday is next Friday",
    detail: "7 days to go · 14 people on Design",
    active: true,
  },
  {
    title: "Tom's 5-year anniversary",
    detail: "In 12 days · Reminder on Monday",
    className: "opacity-80",
  },
  {
    title: "Jonas's birthday",
    detail: "In 18 days",
    className: "opacity-60",
  },
]

const TEAM_CARDS = [
  {
    card: "Priya · Birthday",
    team: "Design",
    status: "Collecting",
    statusClass: cn(coralText, "font-medium"),
  },
  { card: "Tom · 5 years", team: "Engineering", status: "Scheduled 14 Oct" },
  { card: "Mei · Farewell", team: "Sales", status: "Draft" },
  {
    card: "Ana · Promotion",
    team: "Support",
    status: "Sent",
    statusClass: cn(sentText, "font-medium"),
  },
]

const MESSAGES = [
  {
    name: "Sam",
    text: "Happy birthday! Thanks for always reviewing my files at 6pm",
  },
  { name: "Leah", text: "Have the best day, Priya" },
]

const NEXT_STEPS = [
  "We reply with a quote by email",
  "A short call if you'd like a walkthrough",
  "We help you import your team's dates",
]

function Avatar({
  person,
  className,
}: {
  person: { initials: string; color: string }
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-[7px] text-[11px] font-bold text-white",
        person.color,
        className,
      )}
    >
      {person.initials}
    </span>
  )
}

function TileHeading({
  title,
  children,
  dark,
}: {
  title: string
  children: React.ReactNode
  dark?: boolean
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-[19px] font-semibold tracking-[-0.02em]">{title}</h3>
      <p
        className={cn(
          "text-[14.5px] leading-[1.6] text-pretty",
          dark ? "text-white/72" : "text-muted-foreground",
        )}
      >
        {children}
      </p>
    </div>
  )
}

function DashboardMockup() {
  return (
    <div
      aria-hidden
      className="mt-12 w-full max-w-245 overflow-hidden rounded-t-[18px] border border-b-0 border-border bg-card text-left shadow-[0_40px_80px_-40px_rgba(17,17,16,0.2)]"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-2.5 rounded-full bg-border" />
          ))}
        </div>
        <span className={cn(mono, "text-[11px]")}>
          Northwind · Team dashboard
        </span>
      </div>
      <div className="flex flex-wrap">
        <div className="flex flex-[1_1_260px] flex-col gap-1 border-border/60 p-5 md:border-r">
          <span className="mb-2 text-[13px] font-semibold">This month</span>
          {THIS_MONTH.map((row) => (
            <div key={row.label} className="flex items-center gap-2.5 py-2">
              <Avatar person={row.person} />
              <span className="flex-1 text-[13.5px]">{row.label}</span>
              <span className="font-mono text-[11.5px] text-muted-foreground">
                {row.date}
              </span>
            </div>
          ))}
        </div>
        <div className="flex min-w-0 flex-[2_1_520px] gap-4 overflow-hidden p-5">
          {DASHBOARD_CARDS.map((card) => (
            <div
              key={card.name}
              className="flex min-w-37.5 flex-1 flex-col gap-2.5"
            >
              <div className="relative aspect-4/5 w-full overflow-hidden rounded-[10px]">
                <Image
                  src={card.src}
                  alt=""
                  fill
                  sizes="(min-width: 980px) 200px, 40vw"
                  className="object-cover"
                />
              </div>
              <span className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">{card.name}</span>
                <span
                  className={cn(
                    "text-xs",
                    card.statusClass ?? "text-muted-foreground",
                  )}
                >
                  {card.status}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CalendarTile() {
  return (
    <div className="flex flex-wrap gap-6 rounded-[20px] border border-border bg-background p-7 lg:col-span-2">
      <div className="min-w-55 flex-1">
        <TileHeading title="Shared team calendar">
          Birthdays and work anniversaries for everyone, added once and repeated
          every year. Import from a spreadsheet or add people as they join.
        </TileHeading>
      </div>
      <div
        aria-hidden
        className="grid min-w-60 flex-1 grid-cols-7 content-center gap-1 self-center font-mono text-[11px] text-muted-foreground"
      >
        {CALENDAR_DAYS.map((day) => (
          <span
            key={day}
            className={cn(
              "flex aspect-square items-center justify-center rounded-md",
              CALENDAR_HIGHLIGHTS[day]
                ? cn(CALENDAR_HIGHLIGHTS[day], "text-white")
                : "bg-card",
            )}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  )
}

function RemindersTile() {
  return (
    <div className="flex flex-col gap-6 rounded-[20px] bg-[#111110] p-7 text-white">
      <TileHeading title="Reminders before the day" dark>
        The organiser hears about it a week ahead, so there&apos;s time to
        collect signatures.
      </TileHeading>
      <div aria-hidden className="mt-auto flex flex-col gap-2 text-[#111110]">
        {REMINDERS.map((reminder) => (
          <div
            key={reminder.title}
            className={cn(
              "flex items-center gap-3 rounded-xl bg-white p-3",
              reminder.className,
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                reminder.active
                  ? "bg-brand/10 text-brand"
                  : "bg-[oklch(0.958_0.008_83)] text-[#5f5d5b]",
              )}
            >
              {reminder.active ? (
                <Bell className="size-4" />
              ) : (
                <Calendar className="size-4" />
              )}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] leading-snug font-semibold">
                {reminder.title}
              </span>
              <span className="truncate text-[12.5px] text-[#5f5d5b]">
                {reminder.detail}
              </span>
            </span>
            {reminder.active && (
              <span className="inline-flex h-7.5 shrink-0 items-center rounded-[7px] bg-brand px-2.5 text-xs font-medium text-white">
                Start card
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardTile() {
  return (
    <div className="flex flex-col gap-6 rounded-[20px] border border-border bg-background p-7">
      <TileHeading title="Dashboard and scheduling">
        See every card across the company and who&apos;s organising it, and
        schedule each one to arrive at 9am on the day.
      </TileHeading>
      <div
        aria-hidden
        className="mt-auto overflow-hidden rounded-xl border border-border bg-card text-[12.5px] shadow-[0_24px_48px_-28px_rgba(17,17,16,0.18)]"
      >
        <div
          className={cn(
            mono,
            "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 border-b border-border px-3.5 py-2.5 text-[10px]",
          )}
        >
          <span>Card</span>
          <span>Status</span>
        </div>
        {TEAM_CARDS.map((row, index) => (
          <div
            key={row.card}
            className={cn(
              "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-3 px-3.5 py-2.5",
              index > 0 && "border-t border-border/60",
            )}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{row.card}</span>
              <span className="truncate text-[11.5px] text-muted-foreground">
                {row.team}
              </span>
            </span>
            <span className={row.statusClass ?? "text-muted-foreground"}>
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OneLinkTile() {
  return (
    <div className="flex flex-col gap-6 rounded-[20px] border border-border bg-background p-7 lg:col-span-2">
      <TileHeading title="One link, everyone signs">
        Share one link in Slack, Teams or email. Colleagues add a message or GIF
        from the link, with no accounts or app to install, and you can see who
        has signed.
      </TileHeading>
      <div
        aria-hidden
        className="mt-auto flex flex-wrap items-center gap-5 rounded-2xl bg-secondary p-5 sm:p-6"
      >
        <div className="relative aspect-4/5 w-30 shrink-0 -rotate-3 overflow-hidden rounded-xl shadow-[0_20px_40px_-20px_rgba(17,17,16,0.4)] sm:w-35">
          <Image
            src="/occasions/birthday.webp"
            alt=""
            fill
            sizes="140px"
            className="object-cover"
          />
        </div>
        <div className="flex min-w-55 flex-1 flex-col gap-3.5">
          <div className="flex items-center gap-2 rounded-[10px] border border-border bg-card py-1.5 pr-1.5 pl-3">
            <span className="flex-1 truncate font-mono text-[12.5px]">
              cardshare.ai/c/priya-birthday
            </span>
            <span className="flex h-7 items-center rounded-md bg-foreground px-2.5 text-[12.5px] font-medium text-background">
              Copy
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold">8 of 14 signed</span>
              <span className="text-muted-foreground">6 to go</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-border">
              <div className="h-full w-[57%] rounded-full bg-brand" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {MESSAGES.map((message) => (
              <div
                key={message.name}
                className="rounded-[10px] bg-card px-3 py-2.5 text-[13px] leading-[1.45]"
              >
                <span className="font-semibold">{message.name}</span>{" "}
                <span className="text-muted-foreground">{message.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamsPage() {
  return (
    <main>
      <section className="mx-auto flex max-w-300 flex-col items-center gap-5.5 px-5 pt-24 text-center sm:px-10">
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-[13px] text-muted-foreground">
          For HR teams and team leads
        </span>
        <h1 className="max-w-205 text-[clamp(40px,5.5vw,68px)] leading-none font-bold tracking-[-0.045em] text-balance">
          Celebrate the <span className="text-brand">whole company</span>{" "}
          without the spreadsheet
        </h1>
        <p className="max-w-140 text-lg leading-[1.55] text-pretty text-muted-foreground">
          CardShare.ai for Teams tracks everyone&apos;s birthdays and work
          anniversaries, reminds the right person, and sends a card the whole
          team has signed.
        </p>
        <div className="mt-1.5 flex flex-wrap justify-center gap-3">
          <Button
            asChild
            className="h-11.5 rounded-[10px] px-4.5 text-[15px] shadow-[0_12px_28px_-14px_rgba(255,90,74,0.8)]"
          >
            <a href="#contact">
              Talk to us about Teams
              <ArrowRight aria-hidden />
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11.5 rounded-[10px] px-4.5 text-[15px] shadow-none"
          >
            <Link href="/create">Try a free card first</Link>
          </Button>
        </div>
        <DashboardMockup />
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-300 flex-col gap-10 px-5 py-24 sm:px-10">
          <h2 className="max-w-140 text-4xl leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            Everything a team needs to celebrate people properly
          </h2>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-3">
            <CalendarTile />
            <RemindersTile />
            <DashboardTile />
            <OneLinkTile />
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-16 border-t border-border">
        <div className="mx-auto grid max-w-300 items-start gap-14 px-5 pt-24 pb-28 sm:px-10 md:grid-cols-2">
          <div className="flex max-w-110 flex-col gap-4.5">
            <span className="font-mono text-[11px] tracking-[0.12em] text-brand uppercase">
              Teams plan
            </span>
            <h2 className="text-[40px] leading-[1.05] font-bold tracking-[-0.035em] text-balance">
              Get a quote for your team
            </h2>
            <p className="leading-[1.6] text-pretty text-muted-foreground">
              Team plans are priced by team size. Tell us a little about your
              team and we&apos;ll email you a quote.
            </p>
            <ol className="mt-3 flex flex-col text-[15px] leading-normal">
              {NEXT_STEPS.map((step, index) => (
                <li
                  key={step}
                  className={cn(
                    "flex gap-4 py-3.5 first:pt-0 last:pb-0",
                    index > 0 && "border-t border-border",
                  )}
                >
                  <span className="mt-0.5 font-mono text-xs text-brand">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer email?{" "}
              <a
                href={`mailto:${TEAMS_ENQUIRY_INBOX}`}
                className="text-foreground underline underline-offset-4 hover:text-brand"
              >
                {TEAMS_ENQUIRY_INBOX}
              </a>
            </p>
          </div>
          <div className="rounded-[20px] border border-border bg-card p-[clamp(22px,3vw,32px)] shadow-[0_24px_48px_-28px_rgba(255,90,74,0.45),0_2px_6px_rgba(17,17,16,0.04)]">
            <TeamsEnquiryForm />
          </div>
        </div>
      </section>
    </main>
  )
}
