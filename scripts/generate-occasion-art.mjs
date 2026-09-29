// Generates missing occasion cover art (`coverImage: null` in lib/category-pages.ts)
// through the app's own /api/generate-image endpoint, saving WebPs sized like the
// existing art. Existing files are skipped, so it can be re-run to resume.
//
//   node scripts/generate-occasion-art.mjs [endpoint-origin]
//
// Afterwards, set each new file's path as `coverImage` in lib/category-pages.ts.
import { existsSync } from "node:fs"
import sharp from "sharp"

const { CATEGORY_CONFIGS } = await import("../lib/category-pages.ts")
const ORIGIN = process.argv[2] ?? "https://www.cardshare.ai"
const ENDPOINT = `${ORIGIN}/api/generate-image`

const TONES = {
  sympathy: "Gentle, calm and understated",
  "get-well-soon": "Warm and cheerful",
  holiday: "Festive and warm",
}
const QUIET = {
  sympathy: "Calm, respectful, soft muted colours, nature imagery, no people",
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const jobs = []
for (const [slug, c] of Object.entries(CATEGORY_CONFIGS)) {
  const cardType = c.label.replace(/ cards$/, "")
  const tone = TONES[slug] ?? "Warm"
  const quiet = QUIET[slug] ? `. ${QUIET[slug]}` : ""
  if (c.coverImage === null) {
    jobs.push({
      out: `public/occasions/${slug}.webp`,
      width: 640,
      height: 794,
      body: {
        cardType,
        tone,
        recipientName: c.sampleRecipient,
        coverHeadline: c.cardTitle,
        userContext: `${c.shortDesc}${quiet}`,
      },
    })
  }
  c.uses.forEach((use, i) => {
    if (use.coverImage !== null) return
    jobs.push({
      out: `public/occasions/uses/${slug}-${i + 1}.webp`,
      width: 480,
      height: 596,
      body: {
        cardType,
        tone,
        coverHeadline: use.headline,
        userContext: `${use.title}. ${use.desc}${quiet}`,
      },
    })
  })
}

async function waitForReset(res) {
  const reset = Number(res.headers.get("x-ratelimit-reset"))
  const seconds = Math.max(5, reset - Date.now() / 1000 + 5)
  console.log(`rate limited, waiting ${Math.round(seconds)}s`)
  await sleep(seconds * 1000)
}

for (const job of jobs) {
  if (existsSync(job.out)) continue
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(job.body),
    })
    if (res.status === 429) {
      await waitForReset(res)
      attempt--
      continue
    }
    const json = await res.json().catch(() => ({}))
    if (res.ok && json.imageUrl?.startsWith("http")) {
      const image = Buffer.from(
        await (await fetch(json.imageUrl)).arrayBuffer(),
      )
      await sharp(image)
        .resize(job.width, job.height, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(job.out)
      console.log("saved", job.out)
      if (res.headers.get("x-ratelimit-remaining") === "0") {
        await waitForReset(res)
      }
      break
    }
    console.log("failed", job.out, res.status, attempt)
    await sleep(5000)
  }
}
