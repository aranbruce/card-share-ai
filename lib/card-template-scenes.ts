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
  "office-chair-sunset":
    "They ride off into a golden desert sunset on a rolling office chair like a cowboy on horseback, wearing a cowboy hat, turned back towards the camera and waving goodbye, with tumbleweeds rolling by and a computer cable coiled like a lasso. Cinematic western, photorealistic.",
  "tie-escape":
    "An action movie still: they abseil down the outside of a glass office tower on a rope made of knotted neckties, grinning at the camera, a briefcase under one arm, while colleagues wave from the windows. Bright daylight, dramatic low angle, photorealistic.",
  "note-balloon":
    "They lean out of the basket of a hot-air balloon made entirely of blank, brightly coloured sticky notes, waving goodbye as it rises above an office building, with colleagues waving back from below. Cheerful, sunny photography.",
  "island-hammock":
    "They lounge blissfully in a hammock between two palm trees on a tiny desert island, sunglasses pushed up on their head and a cocktail with a paper umbrella in hand, with a laptop half-buried in the sand beside them and a turquoise sea all around. Bright holiday photography.",
  "cruise-captain":
    "They are the captain of a gigantic cruise ship, in a crisp white captain's uniform and cap, saluting proudly on the bridge wing, with sparkling sea, a sunset and waving passengers behind them. Photorealistic.",
  "golf-getaway":
    "They drive a plain, unbranded white golf buggy (no badges, logos or lettering) flat out across a golf course like a getaway car in a heist movie, grinning, golf balls bouncing out of the back and a flock of startled geese taking off. Action photography with motion blur on the background, their face sharp.",
  "romcom-poster":
    "A romantic comedy movie still: they stand beaming on a city street at night in the gentle rain under a glowing streetlight, holding a huge bouquet of flowers, while neighbours lean out of the windows above, applauding. Warm cinematic lighting.",
  "cake-summit":
    "They are a mountaineer triumphantly reaching the summit of a towering mountain made of white wedding cake, ice axe raised, planting a plain white flag, with frosting cliffs and sugar-flower ledges far below. Epic adventure photography.",
  "nappy-juggler":
    "They are a circus performer in the spotlight, calmly juggling baby bottles, nappies and a rubber duck, wearing a sparkly ringmaster jacket, while a delighted circus audience cheers. Photorealistic, dramatic circus lighting.",
  "pram-rally":
    "They race a souped-up baby pram carrying a giant teddy bear through a muddy rally course, the pram with no race number, plates or stickers, racing goggles pushed up on their forehead, mud spraying from the wheels and spectators cheering behind the barriers. Action sports photography.",
  "rocket-launch":
    "They sit astride a gleaming rocket made from a giant office water cooler, blasting off from the middle of an open-plan office, giving a big thumbs up, with smoke and sparks billowing and colleagues in hard hats cheering. Cinematic, photorealistic.",
  "corner-office-throne":
    "They sit regally on a golden throne in a corner office with floor-to-ceiling windows over a city skyline, wearing a crown with a sharp business suit, a pug in their lap and a red carpet leading up to the desk. Dramatic, regal photography.",
  "mortarboard-space":
    "They float in space in a graduation gown, tossing their mortarboard towards the camera, tassel drifting in zero gravity and the Earth glowing below. Whimsical, so they wear no helmet and their face is fully visible. Cinematic, photorealistic.",
  "first-day-school":
    "A classic first-day-of-school photo on a front doorstep, except they are a grown adult, beaming proudly in a slightly too-small school uniform, with an enormous backpack, a lunchbox and a bulging briefcase. Warm morning light, family snapshot.",
  "album-cover":
    "A dramatic 1980s album cover portrait: they gaze into the distance in a sparkly jacket with huge shoulder pads, against a purple laser-grid background with smoke and a lens flare. Glossy retro studio photography.",
  "film-star":
    "A glamorous 1940s Hollywood studio portrait: they look over their shoulder with movie-star poise, in an elegant evening outfit, in black and white with dramatic soft lighting.",
  "dino-ride":
    "They ride a single friendly Tyrannosaurus rex (one head) down a busy city high street like a parade horse, wearing a party hat and waving to astonished shoppers. The shopfronts have plain awnings and no signs. Photorealistic, bright daytime.",
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
