// Generates the images for funny photo templates (lib/card-templates.ts), from each
// template's scene in lib/card-template-scenes.ts with a fictional stand-in person:
//
// - public/templates/<id>.webp: the picker thumbnail, with the stand-in's face as a
//   blank "your face here" oval.
// - assets/template-layouts/<id>.webp: the layout reference the cover route sends
//   with the user's photo, made from the thumbnail with the stand-in's whole head
//   (hair too) blanked, so the cover keeps the scene but takes the hair from the photo.
//
// Existing files are skipped, so delete one to regenerate it. A missing layout
// reference is made from the existing thumbnail.
//
//   node --env-file=.env.local scripts/generate-template-thumbnails.mjs [template-id...]
import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { generateText } from "ai"
import sharp from "sharp"

const { CARD_TEMPLATES } = await import("../lib/card-templates.ts")
const { CARD_TEMPLATE_SCENES } = await import("../lib/card-template-scenes.ts")

const MODEL =
  process.env.AI_IMAGE_GATEWAY_MODEL?.trim() ||
  "google/gemini-3.1-flash-image-preview"
const CONCURRENCY = 6

const PEOPLE = {
  "moon-cake": "a woman in her 30s with curly red hair and freckles",
  "banana-rockstar": "a Black man in his 40s with a short grey beard",
  "ball-pit": "a South Asian woman in her 20s with long dark hair",
  "corgi-knight": "a bald white man in his 60s with glasses",
  "employee-of-century": "an East Asian woman in her 40s with a sleek bob",
  "office-superhero": "a Latino man in his 30s with a moustache",
  "town-statue": "a Black woman in her 50s with short natural hair",
  "crowd-carry": "a young white man in his 20s with messy blond hair",
  "olympic-gold": "a Middle Eastern woman in her 30s with a ponytail",
  "marathon-cape": "a white woman in her 50s with a grey pixie cut",
  "champagne-rocket": "a South Asian man in his 40s with a neat beard",
  "head-elf": "a Black man in his 20s with a high-top fade",
  "present-snowboard": "an East Asian man in his 30s with glasses",
  "jumper-shoot": "a white woman in her 70s with silver hair",
  "old-master": "a Latina woman in her 40s with dark wavy hair",
  "action-hero": "an East Asian woman in her 60s with short grey hair",
  "nature-doc": "a white man in his 30s with a ginger beard",
}

const RULES = `Create a full-bleed image for a greeting card cover, in the style the scene describes.
Generate ONLY the raw, edge-to-edge image. No physical card, mockup, picture frame or borders.
STRICTLY NO TEXT: no readable text, lettering, captions, words on signs, trophies or clothing, watermarks, or logos anywhere in the image.
The main character's face must be clearly visible and well lit.`

const OVAL_EDIT = `Edit this image. Replace only the main character's face (from hairline to chin, ear to ear) with a smooth, flat, solid light grey oval, like a "your face here" cut-out placeholder on a fairground board. Keep their hair, head shape, ears, neck, body, pose, clothing, props and the whole background exactly the same. Do not add any text, icons or outlines.`

const HEAD_BLANK_EDIT = `Edit this image. Replace the main character's entire head, including all of their hair, with one smooth, flat, solid light grey head-shaped silhouette (a plain rounded shape, no hairstyle, no features). Keep any hat or helmet they wear, and keep their neck, body, pose, clothing, props and the whole background exactly the same. Do not add any text, icons or outlines.`

const PROVIDER_OPTIONS = {
  google: {
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: { aspectRatio: "4:5" },
  },
}

const only = process.argv.slice(2)
const layoutPath = (t) => `assets/template-layouts/${t.id}.webp`
const jobs = CARD_TEMPLATES.filter(
  (t) =>
    (!only.length || only.includes(t.id)) &&
    !(existsSync(`public${t.thumbnail}`) && existsSync(layoutPath(t))),
)

function imageFrom(files) {
  const image = files.find((f) => f.mediaType.startsWith("image/"))
  if (!image) throw new Error("No image generated")
  return image.uint8Array
}

async function edit(image, instruction) {
  const { files } = await generateText({
    model: MODEL,
    prompt: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: await sharp(image).png().toBuffer(),
            mediaType: "image/png",
          },
          { type: "text", text: instruction },
        ],
      },
    ],
    providerOptions: PROVIDER_OPTIONS,
  })
  return imageFrom(files)
}

async function generateScene(t) {
  const scene = CARD_TEMPLATE_SCENES[t.id]
  const person = PEOPLE[t.id]
  if (!scene || !person) throw new Error(`Missing scene or person for ${t.id}`)
  const { files } = await generateText({
    model: MODEL,
    prompt: `${RULES}\n\nThe main character ("they") is ${person}.\n\nScene: ${scene}`,
    providerOptions: PROVIDER_OPTIONS,
  })
  return imageFrom(files)
}

async function run(t) {
  const thumbnailPath = `public${t.thumbnail}`
  if (!existsSync(thumbnailPath)) {
    const scene = await generateScene(t)
    await sharp(await edit(scene, OVAL_EDIT))
      .resize(360, 450, { fit: "cover" })
      .webp({ quality: 78 })
      .toFile(thumbnailPath)
  }
  if (!existsSync(layoutPath(t))) {
    const thumbnail = await readFile(thumbnailPath)
    await sharp(await edit(thumbnail, HEAD_BLANK_EDIT))
      .resize(720, 900, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(layoutPath(t))
  }
}

const queue = [...jobs]
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      try {
        await run(t)
        console.log(`ok   ${t.id}`)
      } catch (e) {
        console.log(`FAIL ${t.id}: ${e.message}`)
      }
    }
  }),
)
