export type CardTemplate = {
  id: string
  name: string
  thumbnail: string
  /** Occasion ids (see `lib/card-occasions.ts`) the scene is offered for, or "all". */
  occasions: string[] | "all"
}

/** Occasions that never offer funny photo templates. */
export const TEMPLATE_EXCLUDED_OCCASIONS = ["sympathy"]

/** Occasions that offer every template. */
const OPEN_OCCASIONS = ["custom"]

function template(
  id: string,
  name: string,
  occasions: CardTemplate["occasions"],
): CardTemplate {
  return { id, name, thumbnail: `/templates/${id}.webp`, occasions }
}

export const CARD_TEMPLATES: CardTemplate[] = [
  template("moon-cake", "Cake on the moon", ["birthday"]),
  template("banana-rockstar", "Banana rock star", ["birthday"]),
  template("ball-pit", "Balloon ball pit", ["birthday"]),
  template("corgi-knight", "Knighted by a corgi", ["birthday"]),
  template("employee-of-century", "Employee of the century", ["thank_you"]),
  template("office-superhero", "Office superhero", ["thank_you"]),
  template("town-statue", "Statue in the square", ["thank_you"]),
  template("crowd-carry", "Carried by the crowd", ["thank_you"]),
  template("olympic-gold", "Olympic gold", ["congratulations"]),
  template("marathon-cape", "Marathon finish", ["congratulations"]),
  template("champagne-rocket", "Champagne rocket", ["congratulations"]),
  template("head-elf", "Santa's head elf", ["holiday"]),
  template("present-snowboard", "Present mountain", ["holiday"]),
  template("jumper-shoot", "Jumper photo shoot", ["holiday"]),
  template("old-master", "Old master", "all"),
  template("action-hero", "Action hero", "all"),
  template("nature-doc", "Nature documentary", "all"),
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
