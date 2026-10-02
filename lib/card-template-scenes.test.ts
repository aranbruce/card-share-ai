import { describe, expect, it } from "vitest"
import { CARD_TEMPLATES } from "@/lib/card-templates"
import {
  CARD_TEMPLATE_SCENES,
  getTemplateLayout,
  getTemplateScene,
} from "@/lib/card-template-scenes"

describe("card template scenes", () => {
  it("has a scene for every template and no orphans", () => {
    expect(Object.keys(CARD_TEMPLATE_SCENES).sort()).toEqual(
      CARD_TEMPLATES.map((t) => t.id).sort(),
    )
  })

  it("returns undefined for unknown or inherited ids", () => {
    expect(getTemplateScene("nope")).toBeUndefined()
    expect(getTemplateScene("toString")).toBeUndefined()
  })

  it("has a layout reference for every template", async () => {
    for (const t of CARD_TEMPLATES) {
      expect(await getTemplateLayout(t.id), t.id).toBeInstanceOf(Uint8Array)
    }
    expect(await getTemplateLayout("../package")).toBeUndefined()
  })
})
