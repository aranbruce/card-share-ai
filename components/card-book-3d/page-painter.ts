import type { BookFace } from "@/lib/card-book"
import type { Contribution } from "@/lib/card-body"
import {
  contributionCanvasOffset,
  contributionHasCanvasPosition,
  contributionPageIndex,
  toFiniteLayoutNumber,
} from "@/lib/contribution-layout"

/** Logical page size in CSS px; matches the flat `Card3D` frame (max-w-md, aspect 4/5). */
export const PAGE_WIDTH_PX = 448
export const PAGE_HEIGHT_PX = 560
/** Texture supersampling so text stays crisp when the camera zooms in. */
export const PAGE_TEXTURE_SCALE = 2

/** Offsets that mirror the flat card canvas: `p-1` frame + "Messages" label block. */
const CANVAS_INSET_PX = 4
const NOTE_AREA_TOP_PX = CANVAS_INSET_PX + 20 + 16 + 4
const NOTE_GIF_GAP_PX = 12
const NOTE_GIF_MAX_HEIGHT_PX = 280
const LINE_HEIGHT = 1.625
const DEFAULT_TEXT_COLOR = "rgba(28, 25, 23, 0.9)"
const MUTED_TEXT_COLOR = "#78716c"

export type PageNote = {
  id: string
  message: string
  giphyUrl: string | null
  /** Top-left inside the note area; null renders in document flow like the flat card. */
  offset: { x: number; y: number } | null
  widthPercent: number
  fontSize: number
  textColor: string | null
  rotationDegrees: number
  fontPresetId: string | null
}

export type BookContent = {
  /**
   * Width (CSS px) of the page the notes were laid out on. Note positions are pixels, so an
   * editor narrower than 448px lays them out on a smaller page; painting at that width keeps
   * the texture identical to the editor sitting on top of it.
   */
  layoutWidth?: number
  imageUrl: string
  headline: string
  recipientName: string
  /** Legacy centred message for cards without a creator contribution row. */
  bodyMessage: string
  messagePage: number
  notesByPage: Map<number, PageNote[]>
}

export type PaintResources = {
  images: ReadonlyMap<string, HTMLImageElement>
  /** Canvas font-family stack for a message font preset (null = app default). */
  fontFamily: (presetId: string | null) => string
}

/** Group contributions by page exactly like `Card3D` does for the flat card. */
export function buildNotesByPage(
  contributions: readonly Contribution[],
  messagePage: number,
  defaultFontSize: number,
): Map<number, PageNote[]> {
  const byPage = new Map<number, PageNote[]>()
  for (const c of contributions) {
    if (c.is_creator && !contributionHasCanvasPosition(c)) continue
    const page = contributionPageIndex(
      c,
      c.is_creator ? messagePage : messagePage + 1,
    )
    const offset = contributionCanvasOffset(c) ?? null
    const note: PageNote = {
      id: c.id,
      message: c.message ?? "",
      giphyUrl: c.giphy_url ?? null,
      offset,
      widthPercent:
        toFiniteLayoutNumber(c.width_percent) ?? (offset ? 75 : 100),
      fontSize: toFiniteLayoutNumber(c.font_size) ?? defaultFontSize,
      textColor: c.text_color ?? null,
      rotationDegrees: toFiniteLayoutNumber(c.rotation_degrees) ?? 0,
      fontPresetId: c.font_family ?? null,
    }
    const list = byPage.get(page)
    if (list) list.push(note)
    else byPage.set(page, [note])
  }
  return byPage
}

/** Image URLs a face needs before it can be painted in full. */
export function faceImageUrls(face: BookFace, content: BookContent): string[] {
  if (face.kind === "cover") return content.imageUrl ? [content.imageUrl] : []
  if (face.kind !== "page") return []
  return (content.notesByPage.get(face.pageIndex) ?? [])
    .map((n) => n.giphyUrl)
    .filter((u): u is string => Boolean(u))
}

/** Everything a face's pixels depend on, to skip repainting faces that did not change. */
export function faceSignature(
  face: BookFace,
  content: BookContent,
  resources: PaintResources,
): string {
  const loaded = faceImageUrls(face, content).map((u) =>
    resources.images.has(u) ? 1 : 0,
  )
  const base = { face, w: content.layoutWidth ?? 0, loaded }
  if (face.kind === "cover") {
    return JSON.stringify({
      ...base,
      img: content.imageUrl,
      headline: content.headline,
      recipient: content.recipientName,
    })
  }
  if (face.kind !== "page") return JSON.stringify(base)
  return JSON.stringify({
    ...base,
    body: face.pageIndex === content.messagePage ? content.bodyMessage : "",
    notes: content.notesByPage.get(face.pageIndex) ?? [],
  })
}

export function faceHasGif(face: BookFace, content: BookContent): boolean {
  return face.kind === "page" && faceImageUrls(face, content).length > 0
}

export function paintFace(
  canvas: HTMLCanvasElement,
  face: BookFace,
  content: BookContent,
  resources: PaintResources,
) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const W = content.layoutWidth || PAGE_WIDTH_PX
  const H = W * (PAGE_HEIGHT_PX / PAGE_WIDTH_PX)
  // The canvas is always PAGE_WIDTH_PX wide (x scale); lay out in a W-wide page.
  const scale = (PAGE_TEXTURE_SCALE * PAGE_WIDTH_PX) / W
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.clearRect(0, 0, W, H)

  switch (face.kind) {
    case "cover":
      paintCover(ctx, content, resources, W, H)
      break
    case "page":
      paintPaper(ctx, W, H)
      paintMessagesPage(ctx, face.pageIndex, content, resources, W, H)
      break
    case "back":
      paintPaper(ctx, W, H)
      paintBackCover(ctx, resources, W, H)
      break
    case "blank":
      paintPaper(ctx, W, H)
      break
  }
}

const paperCache = new Map<string, HTMLCanvasElement>()

/**
 * Paper background (gradient, speckle, fibres) is identical on every inside page, so it is
 * drawn once per size and blitted; repainting it per face made edits and GIF frames slow.
 */
function paintPaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const pxW = PAGE_WIDTH_PX * PAGE_TEXTURE_SCALE
  const pxH = PAGE_HEIGHT_PX * PAGE_TEXTURE_SCALE
  const key = `${W}x${H}`
  let paper = paperCache.get(key)
  if (!paper) {
    paper = document.createElement("canvas")
    paper.width = pxW
    paper.height = pxH
    const paperCtx = paper.getContext("2d")
    if (!paperCtx) return drawPaper(ctx, W, H)
    paperCtx.setTransform(pxW / W, 0, 0, pxH / H, 0, 0)
    drawPaper(paperCtx, W, H)
    paperCache.set(key, paper)
  }
  ctx.drawImage(paper, 0, 0, W, H)
}

function drawPaper(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, "#fffbeb")
  g.addColorStop(1, "#fff7ed")
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  // Deterministic speckle so the paper reads as card stock rather than flat colour.
  let seed = 7
  ctx.fillStyle = "rgba(120, 90, 60, 0.035)"
  for (let i = 0; i < 900; i++) {
    seed = (seed * 16807) % 2147483647
    const x = (seed % 10000) / 10000
    seed = (seed * 16807) % 2147483647
    const y = (seed % 10000) / 10000
    ctx.fillRect(x * W, y * H, 1, 1)
  }

  // Faint fibres, as in cotton card stock.
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return (seed % 10000) / 10000
  }
  ctx.lineWidth = 0.5
  ctx.lineCap = "round"
  for (let i = 0; i < 160; i++) {
    const x = rand() * W
    const y = rand() * H
    const angle = rand() * Math.PI
    const length = 4 + rand() * 10
    const bend = (rand() - 0.5) * 4
    ctx.strokeStyle = `rgba(150, 120, 90, ${0.05 + rand() * 0.05})`
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo(
      x + Math.cos(angle) * length * 0.5 - Math.sin(angle) * bend,
      y + Math.sin(angle) * length * 0.5 + Math.cos(angle) * bend,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    )
    ctx.stroke()
  }
}

function paintCover(
  ctx: CanvasRenderingContext2D,
  content: BookContent,
  resources: PaintResources,
  W: number,
  H: number,
) {
  const img = content.imageUrl
    ? resources.images.get(content.imageUrl)
    : undefined
  if (img) {
    drawImageCover(ctx, img, 0, 0, W, H)
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, "#f59e0b")
    g.addColorStop(1, "#b45309")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // Matches `bg-linear-to-t from-black/80 via-black/20 to-transparent`.
  const shade = ctx.createLinearGradient(0, H, 0, 0)
  shade.addColorStop(0, "rgba(0,0,0,0.8)")
  shade.addColorStop(0.5, "rgba(0,0,0,0.2)")
  shade.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, W, H)

  const family = resources.fontFamily(null)
  const padding = 24
  const maxWidth = W - padding * 2
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillStyle = "#ffffff"

  const forFontSize = 14
  const forLineHeight = 20
  let y = H - padding - forLineHeight
  ctx.globalAlpha = 0.8
  ctx.font = `400 ${forFontSize}px ${family}`
  ctx.fillText(`For ${content.recipientName}`, W / 2, y + 3, maxWidth)
  ctx.globalAlpha = 1

  const headlineSize = 30
  const headlineLineHeight = headlineSize * 1.25
  ctx.font = `700 ${headlineSize}px ${family}`
  const lines = wrapText(ctx, content.headline.trim(), maxWidth)
  y -= 8 + lines.length * headlineLineHeight
  for (const line of lines) {
    ctx.fillText(line, W / 2, y + 3, maxWidth)
    y += headlineLineHeight
  }
}

function paintBackCover(
  ctx: CanvasRenderingContext2D,
  resources: PaintResources,
  W: number,
  H: number,
) {
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = MUTED_TEXT_COLOR
  ctx.font = `500 12px ${resources.fontFamily(null)}`
  ctx.fillText("Made with CardShare.ai", W / 2, H - 48)
}

function paintMessagesPage(
  ctx: CanvasRenderingContext2D,
  pageIndex: number,
  content: BookContent,
  resources: PaintResources,
  W: number,
  H: number,
) {
  const noteAreaWidth = W - CANVAS_INSET_PX * 2
  const noteAreaHeight = H - NOTE_AREA_TOP_PX - CANVAS_INSET_PX
  const baseFamily = resources.fontFamily(null)
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillStyle = MUTED_TEXT_COLOR
  ctx.font = `500 12px ${baseFamily}`
  drawTrackedText(ctx, "MESSAGES", CANVAS_INSET_PX + 20, CANVAS_INSET_PX + 20)

  ctx.save()
  ctx.translate(CANVAS_INSET_PX, NOTE_AREA_TOP_PX)

  const body = content.bodyMessage.trim()
  if (pageIndex === content.messagePage && body) {
    const fontSize = 18
    ctx.font = `400 ${fontSize}px ${baseFamily}`
    const lines = wrapText(ctx, body, noteAreaWidth - 32)
    const blockHeight = lines.length * fontSize * LINE_HEIGHT
    const top = Math.max(0, (noteAreaHeight - blockHeight) / 2)
    ctx.fillStyle = DEFAULT_TEXT_COLOR
    drawLines(ctx, lines, 16, top, fontSize)
  }

  let flowY = 0
  for (const note of content.notesByPage.get(pageIndex) ?? []) {
    const width = (noteAreaWidth * note.widthPercent) / 100
    const x = note.offset?.x ?? 0
    const y = note.offset?.y ?? flowY
    const height = paintNote(ctx, note, x, y, width, resources)
    if (!note.offset) flowY += height
  }

  ctx.restore()
}

/** Paints one note (GIF above text) and returns its unrotated height. */
function paintNote(
  ctx: CanvasRenderingContext2D,
  note: PageNote,
  x: number,
  y: number,
  width: number,
  resources: PaintResources,
): number {
  const family = resources.fontFamily(note.fontPresetId)
  ctx.font = `400 ${note.fontSize}px ${family}`
  const lines = note.message.trim() ? wrapText(ctx, note.message, width) : []
  const textHeight = lines.length * note.fontSize * LINE_HEIGHT

  let gifW = 0
  let gifH = 0
  const gif = note.giphyUrl ? resources.images.get(note.giphyUrl) : undefined
  if (note.giphyUrl) {
    if (gif && gif.naturalWidth > 0) {
      const scale = Math.min(
        1,
        width / gif.naturalWidth,
        NOTE_GIF_MAX_HEIGHT_PX / gif.naturalHeight,
      )
      gifW = gif.naturalWidth * scale
      gifH = gif.naturalHeight * scale
    } else {
      gifW = width
      gifH = Math.min(NOTE_GIF_MAX_HEIGHT_PX, width * 0.6)
    }
  }
  const gap = gifH > 0 && lines.length > 0 ? NOTE_GIF_GAP_PX : 0
  const height = gifH + gap + textHeight

  ctx.save()
  ctx.translate(x + width / 2, y + height / 2)
  ctx.rotate((note.rotationDegrees * Math.PI) / 180)
  ctx.translate(-width / 2, -height / 2)

  if (gifH > 0) {
    const gx = (width - gifW) / 2
    ctx.save()
    roundRect(ctx, gx, 0, gifW, gifH, 6)
    ctx.clip()
    if (gif && gif.naturalWidth > 0) {
      ctx.drawImage(gif, gx, 0, gifW, gifH)
    } else {
      ctx.fillStyle = "rgba(120, 113, 108, 0.12)"
      ctx.fillRect(gx, 0, gifW, gifH)
    }
    ctx.restore()
  }

  ctx.fillStyle = note.textColor || DEFAULT_TEXT_COLOR
  ctx.font = `400 ${note.fontSize}px ${family}`
  drawLines(ctx, lines, 0, gifH + gap, note.fontSize)
  ctx.restore()

  return height
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  fontSize: number,
) {
  const lineHeight = fontSize * LINE_HEIGHT
  // Canvas "top" baseline sits at the em box top; offset by half the leading like CSS does.
  const leading = (lineHeight - fontSize) / 2
  lines.forEach((line, i) => {
    ctx.fillText(line, x, top + i * lineHeight + leading)
  })
}

function drawTrackedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) {
  // `tracking-wider` (0.05em) without relying on ctx.letterSpacing support.
  const spacing = 0.6
  let cursor = x
  for (const ch of text) {
    ctx.fillText(ch, cursor, y)
    cursor += ctx.measureText(ch).width + spacing
  }
}

/** Greedy word wrap that honours explicit newlines and breaks overlong words. */
export function wrapText(
  ctx: { measureText(text: string): { width: number } },
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = []
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth
  for (const paragraph of text.split("\n")) {
    let line = ""
    for (const word of paragraph.split(/[ \t]+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (fits(candidate)) {
        line = candidate
        continue
      }
      if (line) out.push(line)
      // Word wider than the note on its own: hard-break it by characters.
      line = ""
      for (const ch of word) {
        if (line && !fits(line + ch)) {
          out.push(line)
          line = ch
        } else {
          line += ch
        }
      }
    }
    out.push(line)
  }
  return out
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth
  const ih = img.naturalHeight
  if (!iw || !ih) return
  const scale = Math.max(w / iw, h / ih)
  const sw = w / scale
  const sh = h / scale
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
