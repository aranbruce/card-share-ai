import { readFile } from "node:fs/promises"
import path from "node:path"

/**
 * Scene prompts for funny photo templates, keyed by `CardTemplate.id` in
 * `lib/card-templates.ts`. Kept server-side so the client only ever sends an id.
 * "They" is the person from the uploaded photo; keep their face clearly visible.
 */
export const CARD_TEMPLATE_SCENES: Record<string, string> = {
  "moon-cake":
    "They are an astronaut on the moon, helmet visor up so their face is clearly visible, proudly planting a flag that is a giant slice of birthday cake with a lit candle. Earth in the background. Photorealistic, cinematic.",
  "banana-rockstar":
    "They are a stadium rock star mid-guitar-solo on stage, hair flying, pyrotechnics and a roaring crowd, but the guitar is an inflatable banana. Concert photography, dramatic lighting.",
  "ball-pit":
    "They are an adult gleefully diving into an enormous ball pit filled with colourful party balloons instead of balls, wearing a party hat, balloons flying everywhere. Bright, joyful flash photography.",
  "corgi-knight":
    "They kneel facing the camera in a grand medieval throne room, looking delighted, being solemnly knighted by a corgi wearing a tiny crown and holding a sword in its mouth. Courtiers look on. Photorealistic, warm candlelight.",
  "employee-of-century":
    "A glossy studio photo shoot: they pose dramatically as the greatest employee of all time, with a wind machine blowing their hair, wearing a sparkly blazer, surrounded by trophies and holding a golden stapler. Studio fashion lighting.",
  "office-superhero":
    "They are a superhero in a cape, hands on hips, hair blowing in the wind, standing heroically on an office desk with confetti exploding behind them. Photorealistic movie still, dramatic lighting.",
  "town-statue":
    "A huge bronze-coloured statue of them stands in a sunny town square, striking a heroic pose holding a coffee mug aloft, while pigeons perch on it and admiring townspeople take photos. The statue's face is clearly theirs. Photorealistic.",
  "crowd-carry":
    "They are carried shoulder-high by a cheering crowd of office colleagues through an open-plan office, arms raised in triumph, confetti and paper flying. Candid photo, joyful.",
  "olympic-gold":
    "They stand in a packed athletics stadium at night, biting a giant gold medal, tearful with joy, wearing a tracksuit, with flashbulbs and a stadium crowd behind them. Sports photography.",
  "marathon-cape":
    "They burst through a plain white ribbon at the end of a city marathon wearing a superhero cape, a sweatband and a plain vest with no race number, with no banners overhead, arms in the air, crowds cheering and confetti cannons firing. Sports photography.",
  "champagne-rocket":
    "They ride a giant champagne bottle like a rocket through a starry night sky, foam trailing behind like rocket exhaust, grinning and waving, fireworks around them. Cinematic, photorealistic.",
  "head-elf":
    "They are Santa's head elf in a cosy workshop, wearing a green elf outfit and pointy hat, proudly supervising a production line of toys, holding a clipboard, with elves and snow outside the window. Warm festive photography.",
  "present-snowboard":
    "They snowboard down a towering mountain made entirely of wrapped Christmas presents, in a festive jumper and Santa hat, ribbons flying, snow spraying. Action sports photography.",
  "jumper-shoot":
    "A high-fashion magazine-style photo shoot: they pose dramatically in a ridiculously over-the-top Christmas jumper covered in lights and pom-poms, with a wind machine and fake snow. Studio fashion lighting.",
  "old-master":
    "A grand Renaissance oil portrait of them in ornate royal clothing and a ruff collar, holding a coffee mug like a sceptre, with a very serious expression. Museum lighting.",
  "action-hero":
    "A full-bleed 1980s action movie still: they walk towards the camera, away from a huge explosion in slow motion, wearing sunglasses pushed up on their head and a leather jacket, holding a party popper. Dramatic cinematic lighting.",
  "nature-doc":
    "They are a nature documentary presenter in a safari hat and khakis, crouching in tall grass and whispering to camera, while a curious giraffe peers over their shoulder. Golden hour wildlife photography.",
}

/** Layout reference for a template (see scripts/generate-template-thumbnails.mjs), if it has one. */
export async function getTemplateLayout(
  templateId: string,
): Promise<Uint8Array | undefined> {
  if (!getTemplateScene(templateId)) return undefined
  try {
    return await readFile(
      path.join(process.cwd(), "assets/template-layouts", `${templateId}.webp`),
    )
  } catch {
    return undefined
  }
}

export function getTemplateScene(templateId: string): string | undefined {
  return Object.hasOwn(CARD_TEMPLATE_SCENES, templateId)
    ? CARD_TEMPLATE_SCENES[templateId]
    : undefined
}
