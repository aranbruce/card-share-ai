"use client"

import { useSyncExternalStore, type ReactNode } from "react"
import { MailIcon, MessageSquareIcon, Share2Icon } from "lucide-react"
import {
  TELEGRAM_ICON,
  WHATSAPP_ICON,
  type BrandIcon as BrandIconData,
} from "@/lib/brand-icons"
import {
  shareAppUrls,
  type ShareApp,
  type ShareContent,
} from "@/lib/share-app-urls"


const subscribe = () => () => {}

/** Whether the browser has a share sheet (phones, Safari); unknown on the server. */
function useCanShareNatively(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof navigator.share === "function",
    () => false,
  )
}

function BrandIcon({ icon }: { icon: BrandIconData }) {
  return (
    <svg viewBox="0 0 24 24" fill={`#${icon.hex}`} aria-hidden="true">
      <path d={icon.path} />
    </svg>
  )
}

function ShareTarget({
  label,
  icon,
  href,
  onClick,
}: {
  label: string
  icon: ReactNode
  href?: string
  onClick: () => void
}) {
  const content = (
    <>
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-background transition-colors group-hover:border-foreground/30 [&_svg]:size-5">
        {icon}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </>
  )
  const className =
    "group flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  // sms: and mailto: hand off to an app; a new tab for them would be left empty
  const external = href?.startsWith("https:")
  return href ? (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={className}
      onClick={onClick}
    >
      {content}
    </a>
  ) : (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  )
}

/**
 * One-tap buttons to share a card link in a messaging app, and on devices with a share sheet
 * a "More" button for every other app. Public feeds (X, LinkedIn, Facebook) are left out on
 * purpose: anyone with the link can open the card.
 */
export function ShareAppButtons({
  content,
  onShare,
}: {
  content: ShareContent
  /** Called when one is used, e.g. to record that the card was shared. */
  onShare?: (app: ShareApp) => void
}) {
  const canShareNatively = useCanShareNatively()
  const urls = shareAppUrls(content)

  const shareNatively = async () => {
    try {
      await navigator.share({
        title: content.emailSubject,
        text: content.message,
        url: content.link,
      })
      onShare?.("more")
    } catch {
      // Dismissed, or the browser refused: nothing was shared.
    }
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Share to an app">
      <ShareTarget
        label="WhatsApp"
        icon={<BrandIcon icon={WHATSAPP_ICON} />}
        href={urls.whatsapp}
        onClick={() => onShare?.("whatsapp")}
      />
      <ShareTarget
        label="Messages"
        icon={<MessageSquareIcon />}
        href={urls.messages}
        onClick={() => onShare?.("messages")}
      />
      <ShareTarget
        label="Telegram"
        icon={<BrandIcon icon={TELEGRAM_ICON} />}
        href={urls.telegram}
        onClick={() => onShare?.("telegram")}
      />
      <ShareTarget
        label="Email"
        icon={<MailIcon />}
        href={urls.email}
        onClick={() => onShare?.("email")}
      />
      {canShareNatively ? (
        <ShareTarget
          label="More"
          icon={<Share2Icon />}
          onClick={() => void shareNatively()}
        />
      ) : null}
    </div>
  )
}
