export type CardTemplate = {
  id: string
  name: string
  thumbnail: string
  /** Occasion ids (see `lib/card-occasions.ts`) the scene is offered for, or "all". */
  occasions: string[] | "all"
  /** Occasion page slugs (see `lib/category-pages.ts`) that show the scene in their gallery.
   * Scenes for "all" occasions show on every page that offers templates. */
  pages: string[]
  /** Centre of the thumbnail's face oval, as fractions of its width and height. */
  face: [number, number]
}

/** Occasions that never offer funny photo templates. */
export const TEMPLATE_EXCLUDED_OCCASIONS = ["sympathy"]

/** Occasion pages that never show funny photo templates. */
export const TEMPLATE_EXCLUDED_PAGES = ["sympathy"]

/** Where each thumbnail's face oval sits (see `CardTemplate.face`). */
const FACES: Record<string, [number, number]> = {
  "moon-cake": [0.6, 0.35],
  "banana-rockstar": [0.53, 0.39],
  "ball-pit": [0.4, 0.43],
  "corgi-knight": [0.57, 0.42],
  "employee-of-century": [0.51, 0.24],
  "office-superhero": [0.48, 0.21],
  "town-statue": [0.5, 0.16],
  "crowd-carry": [0.51, 0.29],
  "olympic-gold": [0.49, 0.44],
  "marathon-cape": [0.51, 0.36],
  "champagne-rocket": [0.5, 0.23],
  "head-elf": [0.51, 0.4],
  "present-snowboard": [0.48, 0.29],
  "jumper-shoot": [0.51, 0.21],
  "office-chair-sunset": [0.49, 0.29],
  "tie-escape": [0.47, 0.3],
  "note-balloon": [0.49, 0.44],
  "island-hammock": [0.38, 0.49],
  "cruise-captain": [0.52, 0.42],
  "golf-getaway": [0.61, 0.43],
  "romcom-poster": [0.5, 0.47],
  "cake-summit": [0.64, 0.18],
  "nappy-juggler": [0.48, 0.36],
  "pram-rally": [0.57, 0.28],
  "rocket-launch": [0.51, 0.22],
  "corner-office-throne": [0.5, 0.35],
  "mortarboard-space": [0.52, 0.35],
  "first-day-school": [0.54, 0.21],
  "old-master": [0.49, 0.25],
  "action-hero": [0.51, 0.43],
  "nature-doc": [0.5, 0.48],
  "album-cover": [0.45, 0.4],
  "film-star": [0.56, 0.34],
  "dino-ride": [0.52, 0.29],
}

/** Occasions that offer every template. */
const OPEN_OCCASIONS = ["custom"]

function template(
  id: string,
  name: string,
  occasions: CardTemplate["occasions"],
  pages: string[] = [],
): CardTemplate {
  const face = FACES[id] ?? [0.5, 0.35]
  return {
    id,
    name,
    thumbnail: `/templates/${id}.webp`,
    occasions,
    pages,
    face,
  }
}

export const CARD_TEMPLATES: CardTemplate[] = [
  template("moon-cake", "Cake on the moon", ["birthday"], ["birthday"]),
  template("banana-rockstar", "Banana rock star", ["birthday"], ["birthday"]),
  template("ball-pit", "Balloon ball pit", ["birthday"], ["birthday"]),
  template("corgi-knight", "Knighted by a corgi", ["birthday"], ["birthday"]),
  template(
    "employee-of-century",
    "Employee of the century",
    ["thank_you"],
    ["thank-you", "kudos", "work-anniversary"],
  ),
  template(
    "office-superhero",
    "Office superhero",
    ["thank_you"],
    ["thank-you", "kudos"],
  ),
  template(
    "town-statue",
    "Statue in the square",
    ["thank_you"],
    ["thank-you", "kudos", "retirement"],
  ),
  template(
    "crowd-carry",
    "Carried by the crowd",
    ["thank_you"],
    ["thank-you", "kudos", "farewell"],
  ),
  template(
    "olympic-gold",
    "Olympic gold",
    ["congratulations"],
    ["promotion", "graduation"],
  ),
  template(
    "marathon-cape",
    "Marathon finish",
    ["congratulations"],
    ["promotion", "get-well-soon"],
  ),
  template(
    "champagne-rocket",
    "Champagne rocket",
    ["congratulations"],
    ["promotion", "wedding"],
  ),
  template("head-elf", "Santa's head elf", ["holiday"], ["holiday"]),
  template("present-snowboard", "Present mountain", ["holiday"], ["holiday"]),
  template("jumper-shoot", "Jumper photo shoot", ["holiday"], ["holiday"]),
  template(
    "office-chair-sunset",
    "Into the sunset",
    ["thank_you", "congratulations"],
    ["farewell"],
  ),
  template(
    "tie-escape",
    "The great escape",
    ["thank_you", "congratulations"],
    ["farewell"],
  ),
  template(
    "note-balloon",
    "Sticky note balloon",
    ["thank_you", "congratulations"],
    ["farewell"],
  ),
  template(
    "island-hammock",
    "Desert island",
    ["thank_you", "congratulations"],
    ["retirement"],
  ),
  template(
    "cruise-captain",
    "Cruise captain",
    ["thank_you", "congratulations"],
    ["retirement"],
  ),
  template(
    "golf-getaway",
    "Golf buggy getaway",
    ["thank_you", "congratulations"],
    ["retirement"],
  ),
  template("romcom-poster", "Rom-com lead", ["congratulations"], ["wedding"]),
  template(
    "cake-summit",
    "Wedding cake summit",
    ["congratulations"],
    ["wedding"],
  ),
  template("nappy-juggler", "Nappy juggler", ["congratulations"], ["new-baby"]),
  template("pram-rally", "Pram rally", ["congratulations"], ["new-baby"]),
  template(
    "rocket-launch",
    "Water cooler rocket",
    ["congratulations", "thank_you"],
    ["promotion", "work-anniversary"],
  ),
  template(
    "corner-office-throne",
    "Corner office throne",
    ["congratulations", "thank_you"],
    ["promotion", "work-anniversary"],
  ),
  template(
    "mortarboard-space",
    "Graduation in orbit",
    ["congratulations"],
    ["graduation"],
  ),
  template(
    "first-day-school",
    "First day at school",
    ["congratulations"],
    ["graduation", "farewell"],
  ),
  template("old-master", "Old master", "all"),
  template("action-hero", "Action hero", "all"),
  template("nature-doc", "Nature documentary", "all"),
  template("album-cover", "80s album cover", "all"),
  template("film-star", "Golden age film star", "all"),
  template("dino-ride", "T. rex parade", "all"),
]

/** Templates offered for an occasion: its own scenes first, then the ones that suit any card. */
export function templatesForOccasion(occasion: string): CardTemplate[] {
  if (TEMPLATE_EXCLUDED_OCCASIONS.includes(occasion)) return []
  if (OPEN_OCCASIONS.includes(occasion)) return CARD_TEMPLATES
  return [
    ...CARD_TEMPLATES.filter(
      (t) => t.occasions !== "all" && t.occasions.includes(occasion),
    ),
    ...CARD_TEMPLATES.filter((t) => t.occasions === "all"),
  ]
}

/** Templates shown on an occasion page: its own scenes first, then the ones that suit any card. */
export function templatesForPage(slug: string): CardTemplate[] {
  if (TEMPLATE_EXCLUDED_PAGES.includes(slug)) return []
  return [
    ...CARD_TEMPLATES.filter((t) => t.pages.includes(slug)),
    ...CARD_TEMPLATES.filter((t) => t.occasions === "all"),
  ]
}

/** The occasion a template link opens the create flow on: birthday for scenes that suit any card. */
export function defaultOccasionForTemplate(template: CardTemplate): string {
  return template.occasions === "all" ? "birthday" : template.occasions[0]
}
