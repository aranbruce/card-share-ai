import {
  CARD_TEMPLATES,
  type CardTemplate,
  templatesForOccasion,
  templatesForPage,
} from "@/lib/card-templates"

/** How many scenes the section cycles through (and shows as thumbnails). */
const SCENE_COUNT = 7

/** The fictional person every scene in the section is "for". */
const SAMPLE_NAME = "Maya"

/** The general variant's scenes (home and Browse): a spread of occasions. */
const GENERAL_IDS = [
  "moon-cake",
  "office-superhero",
  "olympic-gold",
  "head-elf",
  "old-master",
  "banana-rockstar",
  "champagne-rocket",
]

type OccasionCopy = {
  eyebrow: string
  h1: string
  /** Second line of the heading, in the brand colour. */
  h2: string
  /** Who the photo is of, as in "Upload a photo of …". */
  who: string
  cta: string
  /** The handwritten note beside the sample person. */
  label: string
  /** The create flow occasion (`lib/card-occasions.ts`) the section's links open. */
  createOccasion: string
}

/** Copy for each occasion page (`lib/category-pages.ts` slugs) that shows templates. */
const OCCASION_COPY: Record<string, OccasionCopy> = {
  birthday: {
    eyebrow: "Birthday photo templates",
    h1: "Put the birthday person",
    h2: "on the moon, or on stage",
    who: "the birthday person",
    cta: "Start a birthday card",
    label: `${SAMPLE_NAME}, 30 today`,
    createOccasion: "birthday",
  },
  "thank-you": {
    eyebrow: "Thank you photo templates",
    h1: "Thank them with a statue,",
    h2: "a cape or a crowd",
    who: "the person you're thanking",
    cta: "Start a thank you card",
    label: `Thanks, ${SAMPLE_NAME}!`,
    createOccasion: "thank_you",
  },
  kudos: {
    eyebrow: "Kudos photo templates",
    h1: "Give the office hero",
    h2: "the cape they deserve",
    who: "the person getting the kudos",
    cta: "Start a kudos card",
    label: `Nice one, ${SAMPLE_NAME}!`,
    createOccasion: "thank_you",
  },
  "work-anniversary": {
    eyebrow: "Work anniversary photo templates",
    h1: "Another year in,",
    h2: "straight to the throne",
    who: "the person celebrating",
    cta: "Start an anniversary card",
    label: `${SAMPLE_NAME}, 5 years in`,
    createOccasion: "congratulations",
  },
  promotion: {
    eyebrow: "Promotion photo templates",
    h1: "Give the big news",
    h2: "a gold medal finish",
    who: "whoever got the news",
    cta: "Start a promotion card",
    label: `${SAMPLE_NAME} got promoted`,
    createOccasion: "congratulations",
  },
  farewell: {
    eyebrow: "Farewell photo templates",
    h1: "Send them off",
    h2: "into the sunset",
    who: "whoever is leaving",
    cta: "Start a farewell card",
    label: `Bon voyage, ${SAMPLE_NAME}`,
    createOccasion: "thank_you",
  },
  retirement: {
    eyebrow: "Retirement photo templates",
    h1: "Retire them to",
    h2: "a desert island",
    who: "the new retiree",
    cta: "Start a retirement card",
    label: `${SAMPLE_NAME}, retired!`,
    createOccasion: "congratulations",
  },
  wedding: {
    eyebrow: "Wedding photo templates",
    h1: "Cast them as",
    h2: "the rom-com lead",
    who: "one of the happy couple",
    cta: "Start a wedding card",
    label: `${SAMPLE_NAME} said yes`,
    createOccasion: "congratulations",
  },
  "new-baby": {
    eyebrow: "New baby photo templates",
    h1: "Show off their",
    h2: "new parenting skills",
    who: "the new parent",
    cta: "Start a new baby card",
    label: `${SAMPLE_NAME}, new parent`,
    createOccasion: "congratulations",
  },
  graduation: {
    eyebrow: "Graduation photo templates",
    h1: "Send the graduate",
    h2: "into orbit",
    who: "the graduate",
    cta: "Start a graduation card",
    label: `${SAMPLE_NAME} graduated!`,
    createOccasion: "congratulations",
  },
  "get-well-soon": {
    eyebrow: "Get well photo templates",
    h1: "Get them back",
    h2: "on their feet",
    who: "the person you're cheering on",
    cta: "Start a get well card",
    label: `Get well, ${SAMPLE_NAME}`,
    createOccasion: "custom",
  },
  holiday: {
    eyebrow: "Holiday photo templates",
    h1: "Make them Santa's",
    h2: "head elf this year",
    who: "anyone on the list",
    cta: "Start a holiday card",
    label: `${SAMPLE_NAME}, head elf`,
    createOccasion: "holiday",
  },
}

/** The general variant's label for scenes that suit any card. */
const ANY_LABEL = `${SAMPLE_NAME}, legend`

/** Opens the create flow on the cover step, with the occasion (and template) picked. */
export function photoTemplateCreateHref(
  occasion: string,
  template?: CardTemplate,
): string {
  // Fall back to the template's own occasion when this one doesn't offer it.
  const offered =
    !template ||
    templatesForOccasion(occasion).some((t) => t.id === template.id)
  const target = offered
    ? occasion
    : template.occasions === "all"
      ? "custom"
      : template.occasions[0]
  const params = new URLSearchParams({ occasion: target })
  if (template) params.set("template", template.id)
  return `/create?${params}`
}

export type PhotoTemplateScene = {
  id: string
  name: string
  thumbnail: string
  face: [number, number]
  label: string
  href: string
}

export type PhotoTemplatesSectionData = {
  eyebrow: string
  h1: string
  h2: string
  body: string
  cta: string
  scenes: PhotoTemplateScene[]
  /** Scenes not shown, in the template picker `moreHref` opens. */
  more: number
  moreHref: string
}

const byId = (id: string) => CARD_TEMPLATES.find((t) => t.id === id)

/** The general variant, for the home and Browse pages. */
export function generalPhotoTemplatesSection(): PhotoTemplatesSectionData {
  const templates = GENERAL_IDS.flatMap((id) => byId(id) ?? [])
  const scenes = templates.map((t) => {
    const page = t.pages[0]
    const copy = page ? OCCASION_COPY[page] : undefined
    const occasion = t.occasions === "all" ? "custom" : t.occasions[0]
    return {
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      face: t.face,
      label: copy?.label ?? ANY_LABEL,
      href: photoTemplateCreateHref(occasion, t),
    }
  })
  const pickerHref = photoTemplateCreateHref("custom")
  return {
    eyebrow: "Funny photo templates",
    h1: "Make them the star",
    h2: "of the cover",
    body: `Upload a photo of a friend, family member or colleague and pick one of ${CARD_TEMPLATES.length} scenes. AI redraws them into it, keeping their face and hair, then the whole group signs the card`,
    cta: "Start a card",
    scenes,
    more: CARD_TEMPLATES.length - scenes.length,
    moreHref: pickerHref,
  }
}

/** The occasion variant: the page's own scenes first, then ones that suit any card. */
export function occasionPhotoTemplatesSection(
  slug: string,
): PhotoTemplatesSectionData | null {
  const copy = OCCASION_COPY[slug]
  const templates = templatesForPage(slug).slice(0, SCENE_COUNT)
  if (!copy || templates.length === 0) return null
  const pickerHref = photoTemplateCreateHref(copy.createOccasion)
  return {
    eyebrow: copy.eyebrow,
    h1: copy.h1,
    h2: copy.h2,
    body: `Upload a photo of ${copy.who} and pick a scene. AI redraws them into it as the star of the cover, then the whole group signs the card`,
    cta: copy.cta,
    scenes: templates.map((t) => ({
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail,
      face: t.face,
      label: copy.label,
      href: photoTemplateCreateHref(copy.createOccasion, t),
    })),
    more: Math.max(
      0,
      templatesForOccasion(copy.createOccasion).length - templates.length,
    ),
    moreHref: pickerHref,
  }
}

/** Occasion pages with tailored copy, for tests. */
export const PHOTO_TEMPLATE_OCCASION_PAGES = Object.keys(OCCASION_COPY)
