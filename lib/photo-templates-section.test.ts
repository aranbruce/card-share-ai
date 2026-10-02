import { describe, expect, it } from "vitest"
import { getCardOccasion } from "@/lib/card-occasions"
import {
  CARD_TEMPLATES,
  TEMPLATE_EXCLUDED_PAGES,
  templatesForOccasion,
} from "@/lib/card-templates"
import { CATEGORY_CONFIGS } from "@/lib/category-pages"
import {
  generalPhotoTemplatesSection,
  occasionPhotoTemplatesSection,
  PHOTO_TEMPLATE_OCCASION_PAGES,
  photoTemplateCreateHref,
} from "@/lib/photo-templates-section"

const linkParams = (href: string) =>
  new URL(href, "https://x.test").searchParams

/** A section link opens a real occasion that offers its template. */
function expectOpensOfferedTemplate(href: string) {
  const params = linkParams(href)
  const occasion = params.get("occasion")!
  expect(getCardOccasion(occasion), href).toBeDefined()
  const template = params.get("template")
  if (template) {
    expect(
      templatesForOccasion(occasion).map((t) => t.id),
      href,
    ).toContain(template)
  }
}

describe("photo templates section", () => {
  it("has tailored copy for every occasion page that shows templates", () => {
    const pages = Object.keys(CATEGORY_CONFIGS).filter(
      (slug) => !TEMPLATE_EXCLUDED_PAGES.includes(slug),
    )
    expect([...PHOTO_TEMPLATE_OCCASION_PAGES].sort()).toEqual(pages.sort())
  })

  it("leaves the sympathy page out", () => {
    expect(occasionPhotoTemplatesSection("sympathy")).toBeNull()
  })

  it("shows an occasion's own scenes first, up to seven", () => {
    const section = occasionPhotoTemplatesSection("farewell")!
    expect(section.scenes).toHaveLength(7)
    expect(section.scenes[0].id).toBe("crowd-carry")
    expect(section.scenes.every((s) => s.label === "Bon voyage, Maya")).toBe(
      true,
    )
  })

  it("links every scene to an occasion that offers it", () => {
    const sections = [
      generalPhotoTemplatesSection(),
      ...PHOTO_TEMPLATE_OCCASION_PAGES.map((slug) =>
        occasionPhotoTemplatesSection(slug)!,
      ),
    ]
    for (const section of sections) {
      for (const scene of section.scenes) expectOpensOfferedTemplate(scene.href)
      expectOpensOfferedTemplate(section.moreHref)
    }
  })

  it("labels general scenes by their occasion", () => {
    const labels = Object.fromEntries(
      generalPhotoTemplatesSection().scenes.map((s) => [s.id, s.label]),
    )
    expect(labels["moon-cake"]).toBe("Maya, 30 today")
    expect(labels["olympic-gold"]).toBe("Maya got promoted")
    expect(labels["old-master"]).toBe("Maya, legend")
  })

  it("counts the scenes left in the general picker", () => {
    const section = generalPhotoTemplatesSection()
    expect(section.more).toBe(CARD_TEMPLATES.length - section.scenes.length)
  })
})

describe("photoTemplateCreateHref", () => {
  const byId = (id: string) => CARD_TEMPLATES.find((t) => t.id === id)!

  it("opens the occasion with the template picked", () => {
    expect(photoTemplateCreateHref("birthday", byId("moon-cake"))).toBe(
      "/create?occasion=birthday&template=moon-cake",
    )
  })

  it("falls back to the template's own occasion when the page's doesn't offer it", () => {
    expect(
      photoTemplateCreateHref("congratulations", byId("employee-of-century")),
    ).toBe("/create?occasion=thank_you&template=employee-of-century")
  })
})
