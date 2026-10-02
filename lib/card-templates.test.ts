import { existsSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { CARD_TEMPLATE_SCENES } from "@/lib/card-template-scenes"
import {
  CARD_TEMPLATES,
  defaultOccasionForTemplate,
  templatesForOccasion,
  templatesForPage,
} from "@/lib/card-templates"
import { CATEGORY_CONFIGS } from "@/lib/category-pages"

const ids = (occasion: string) =>
  templatesForOccasion(occasion).map((t) => t.id)
const anyCard = CARD_TEMPLATES.filter((t) => t.occasions === "all").map(
  (t) => t.id,
)

describe("templatesForOccasion", () => {
  it("lists an occasion's own scenes, then the ones for any card", () => {
    const own = CARD_TEMPLATES.filter(
      (t) => t.occasions !== "all" && t.occasions.includes("birthday"),
    ).map((t) => t.id)
    expect(own.length).toBeGreaterThan(0)
    expect(ids("birthday")).toEqual([...own, ...anyCard])
  })

  it("keeps occasion-only scenes off other occasions", () => {
    expect(ids("thank_you")).not.toContain("moon-cake")
  })

  it("offers every template for custom cards", () => {
    expect(ids("custom")).toHaveLength(CARD_TEMPLATES.length)
  })

  it("offers no templates for sympathy cards", () => {
    expect(ids("sympathy")).toEqual([])
  })

  it("has a thumbnail file for every template", () => {
    for (const t of CARD_TEMPLATES) {
      expect(existsSync(`public${t.thumbnail}`), t.thumbnail).toBe(true)
    }
  })

  it("has a scene and a layout reference for every template", () => {
    for (const t of CARD_TEMPLATES) {
      expect(CARD_TEMPLATE_SCENES[t.id], t.id).toBeTruthy()
      expect(
        existsSync(`assets/template-layouts/${t.id}.webp`),
        `layout for ${t.id}`,
      ).toBe(true)
    }
  })

  it("has a face position inside every thumbnail", () => {
    for (const t of CARD_TEMPLATES) {
      for (const v of t.face) {
        expect(v, t.id).toBeGreaterThan(0)
        expect(v, t.id).toBeLessThan(1)
      }
    }
  })

  it("has unique ids", () => {
    const all = CARD_TEMPLATES.map((t) => t.id)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe("templatesForPage", () => {
  it("only names occasion pages that exist", () => {
    for (const t of CARD_TEMPLATES) {
      for (const slug of t.pages) {
        expect(CATEGORY_CONFIGS[slug], `${t.id} → ${slug}`).toBeDefined()
      }
    }
  })

  it("lists a page's own scenes, then the ones for any card", () => {
    const page = templatesForPage("farewell").map((t) => t.id)
    expect(page.slice(0, 3)).toEqual([
      "crowd-carry",
      "office-chair-sunset",
      "tie-escape",
    ])
    expect(page.slice(-anyCard.length)).toEqual(anyCard)
  })

  it("shows no templates on the sympathy page", () => {
    expect(templatesForPage("sympathy")).toEqual([])
  })
})

describe("defaultOccasionForTemplate", () => {
  it("opens on the template's first occasion, or birthday for any card", () => {
    const byId = (id: string) => CARD_TEMPLATES.find((t) => t.id === id)!
    expect(defaultOccasionForTemplate(byId("pram-rally"))).toBe(
      "congratulations",
    )
    expect(defaultOccasionForTemplate(byId("old-master"))).toBe("birthday")
  })

  it("opens on an occasion that offers the template", () => {
    for (const t of CARD_TEMPLATES) {
      expect(templatesForOccasion(defaultOccasionForTemplate(t))).toContain(t)
    }
  })
})
