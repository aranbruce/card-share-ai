import type { ReactNode } from "react"
import { templatesForPage } from "@/lib/card-templates"
import { getCategoryConfig } from "@/lib/category-pages"
import { COMPARE_CONFIGS } from "@/lib/compare-pages"
import {
  CoverFan,
  CREATE_CARD,
  CreatePageMock,
  loadPublicImage,
  OgPreviewFrame,
  type PlacedImage,
  renderOgPreview,
  SlackMessageMock,
  TeamRemindersMock,
} from "@/lib/og-preview"

/** What a marketing page's link preview shows in its panel. */
type Panel =
  /** Three occasion covers, fanned out, the middle one on top. */
  | { kind: "fan"; occasions: [string, string, string] }
  | { kind: "create" }
  | { kind: "slack" }
  | { kind: "teams" }

type SitePreview = { title: string; panel: Panel }

const PAGE_PREVIEWS: Record<string, SitePreview> = {
  home: {
    title: "Greeting cards, generated in seconds",
    panel: { kind: "fan", occasions: ["farewell", "birthday", "wedding"] },
  },
  browse: {
    title: "A group card for every occasion",
    panel: { kind: "fan", occasions: ["promotion", "thank-you", "farewell"] },
  },
  create: {
    title: "Start a group card",
    panel: { kind: "create" },
  },
  teams: {
    title: "CardShare.ai for Teams",
    panel: { kind: "teams" },
  },
  claude: {
    title: "Use CardShare.ai in Claude",
    panel: { kind: "fan", occasions: ["thank-you", "birthday", "promotion"] },
  },
  chatgpt: {
    title: "Use CardShare.ai in ChatGPT",
    panel: { kind: "fan", occasions: ["kudos", "birthday", "farewell"] },
  },
  slack: {
    title: "Add CardShare.ai to Slack",
    panel: { kind: "slack" },
  },
  ...Object.fromEntries(
    Object.values(COMPARE_CONFIGS).map((config) => [
      `compare-${config.slug}`,
      {
        title: config.h1,
        panel: { kind: "create" },
      },
    ]),
  ),
}

export const SITE_PREVIEW_KEYS = Object.keys(PAGE_PREVIEWS)

/** Path of a marketing page's link preview image (1200×630). */
export function sitePreviewImagePath(key: string): string {
  return `/og/page/${key}`
}

function coverOf(occasion: string): string | null {
  return getCategoryConfig(occasion)?.coverImage ?? null
}

async function placed(
  src: string | null,
  box: Omit<PlacedImage, "src">,
): Promise<PlacedImage> {
  return { ...box, src: await loadPublicImage(src, box.width, box.height) }
}

async function renderPanel(panel: Panel): Promise<ReactNode> {
  switch (panel.kind) {
    case "fan": {
      const [left, middle, right] = panel.occasions.map(coverOf)
      const covers = await Promise.all([
        placed(left, {
          left: 34,
          top: 170,
          width: 220,
          height: 275,
          rotate: -12,
        }),
        placed(right, {
          left: 274,
          top: 180,
          width: 220,
          height: 275,
          rotate: 12,
        }),
        placed(middle, {
          left: 144,
          top: 120,
          width: 240,
          height: 300,
          rotate: -1,
        }),
      ])
      return <CoverFan covers={covers} />
    }
    case "create":
      return (
        <CreatePageMock
          card={await loadPublicImage(
            "/demo/card-heartfelt.webp",
            CREATE_CARD.width,
            CREATE_CARD.height,
          )}
        />
      )
    case "slack":
      return (
        <SlackMessageMock
          card={await loadPublicImage(coverOf("birthday"), 96, 120)}
        />
      )
    case "teams":
      return <TeamRemindersMock />
  }
}

/** Renders a marketing page's link preview, or null for an unknown key. */
export async function renderSitePreview(key: string): Promise<Response | null> {
  const page = PAGE_PREVIEWS[key]
  if (!page) return null

  return renderOgPreview(
    <OgPreviewFrame
      title={page.title}
      panelBackground={page.panel.kind === "teams" ? "#111110" : undefined}
    >
      {await renderPanel(page.panel)}
    </OgPreviewFrame>,
  )
}

/**
 * An occasion page's link preview: its sample cover between two of its photo templates,
 * or null for an unknown occasion.
 */
export async function renderOccasionPreview(
  slug: string,
): Promise<Response | null> {
  const config = getCategoryConfig(slug)
  if (!config) return null

  const [first, second] = templatesForPage(slug).map((t) => t.thumbnail)
  const covers = await Promise.all([
    placed(first ?? null, {
      left: 20,
      top: 170,
      width: 220,
      height: 275,
      rotate: -12,
    }),
    placed(second ?? null, {
      left: 290,
      top: 160,
      width: 220,
      height: 275,
      rotate: 11,
    }),
    placed(config.coverImage, {
      left: 119,
      top: 98,
      width: 290,
      height: 362,
      rotate: -3,
    }),
  ])

  return renderOgPreview(
    <OgPreviewFrame title={config.metaTitle}>
      <CoverFan covers={covers} />
    </OgPreviewFrame>,
  )
}
