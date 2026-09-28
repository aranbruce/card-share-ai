import type { ParsedGif } from "gifuct-js"

/**
 * Plays an animated GIF for canvas painting. `drawImage` on an animated `<img>` always
 * draws its first frame (per the HTML spec), so frames are decoded here instead: with the
 * native `ImageDecoder` where available, otherwise with `gifuct-js`. One frame is decoded
 * at a time, so a long GIF never holds all of its frames in memory.
 */
export type GifPlayer = {
  /** The latest decoded frame, or null until the first one is ready. */
  readonly frame: CanvasImageSource | null
  /**
   * Starts decoding the next frame once the current one has been shown for its delay.
   * Returns true when a new frame has arrived since the last call.
   */
  tick(now: number): boolean
  dispose(): void
}

/** Browsers show frames with a delay of 10ms or less for 100ms; match them. */
export function gifFrameDelayMs(delayMs: number | null | undefined): number {
  return delayMs && delayMs > 10 ? delayMs : 100
}

type FrameDecoder = {
  frameCount: number
  /** Decodes frame `index`, returning what to draw and how long to show it. */
  decode(index: number): Promise<{ frame: CanvasImageSource; delayMs: number }>
  close(): void
}

/**
 * Fetches and prepares a GIF for playback. Resolves null for a still (single-frame) GIF,
 * or when it cannot be fetched or decoded; the caller keeps painting the `<img>` then.
 */
export async function createGifPlayer(
  url: string,
  signal: AbortSignal,
): Promise<GifPlayer | null> {
  const response = await fetch(url, { signal })
  if (!response.ok) return null
  const data = await response.arrayBuffer()
  if (signal.aborted) return null
  const decoder =
    (await createNativeDecoder(data).catch(() => null)) ??
    (await createScriptDecoder(data))
  if (!decoder || decoder.frameCount < 2 || signal.aborted) {
    decoder?.close()
    return null
  }

  let frame: CanvasImageSource | null = null
  let release: (() => void) | null = null
  let index = 0
  let dueAt = 0
  let pending = false
  let fresh = false
  let disposed = false

  return {
    get frame() {
      return frame
    },
    tick(now) {
      if (fresh) {
        fresh = false
        return true
      }
      if (pending || disposed || now < dueAt) return false
      pending = true
      decoder
        .decode(index)
        .then((next) => {
          if (disposed) return closeFrame(next.frame)
          release?.()
          frame = next.frame
          release = () => closeFrame(next.frame)
          index = (index + 1) % decoder.frameCount
          dueAt = performance.now() + next.delayMs
          fresh = true
        })
        // A frame that fails to decode ends playback on the last good frame.
        .catch(() => {
          disposed = true
        })
        .finally(() => {
          pending = false
        })
      return false
    },
    dispose() {
      disposed = true
      release?.()
      release = null
      frame = null
      decoder.close()
    },
  }
}

function closeFrame(frame: CanvasImageSource) {
  if (typeof VideoFrame !== "undefined" && frame instanceof VideoFrame) {
    frame.close()
  }
}

async function createNativeDecoder(
  data: ArrayBuffer,
): Promise<FrameDecoder | null> {
  if (typeof ImageDecoder === "undefined") return null
  if (!(await ImageDecoder.isTypeSupported("image/gif"))) return null
  const decoder = new ImageDecoder({ data, type: "image/gif" })
  try {
    await Promise.all([decoder.tracks.ready, decoder.completed])
    const frameCount = decoder.tracks.selectedTrack?.frameCount ?? 0
    return {
      frameCount,
      async decode(frameIndex) {
        const { image } = await decoder.decode({ frameIndex })
        // VideoFrame durations are in microseconds.
        return {
          frame: image,
          delayMs: gifFrameDelayMs((image.duration ?? 0) / 1000),
        }
      },
      close: () => decoder.close(),
    }
  } catch (error) {
    decoder.close()
    throw error
  }
}

type GifImageFrame = Extract<ParsedGif["frames"][number], { image: unknown }>

async function createScriptDecoder(
  data: ArrayBuffer,
): Promise<FrameDecoder | null> {
  const { parseGIF, decompressFrame } = await import("gifuct-js")
  const gif = parseGIF(data)
  const frames = gif.frames.filter(
    (f): f is GifImageFrame => "image" in f && Boolean(f.image),
  )
  const { width, height } = gif.lsd
  if (width < 1 || height < 1) return null

  // Frames are patches over the previous picture, so they are composited in order.
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const patchCanvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  const patchCtx = patchCanvas.getContext("2d")
  if (!ctx || !patchCtx) return null

  let previous: {
    dims: { left: number; top: number; width: number; height: number }
    disposalType: number
    /** What was under the frame, for disposal type 3 ("restore to previous"). */
    under: ImageData | null
  } | null = null

  return {
    frameCount: frames.length,
    async decode(index) {
      if (index === 0) {
        ctx.clearRect(0, 0, width, height)
      } else if (previous?.disposalType === 2) {
        const { left, top, width: w, height: h } = previous.dims
        ctx.clearRect(left, top, w, h)
      } else if (previous?.disposalType === 3 && previous.under) {
        ctx.putImageData(previous.under, previous.dims.left, previous.dims.top)
      }

      const parsed = decompressFrame(frames[index], gif.gct, true)
      const { left, top, width: w, height: h } = parsed.dims
      const under =
        parsed.disposalType === 3 && w > 0 && h > 0
          ? ctx.getImageData(left, top, w, h)
          : null
      if (w > 0 && h > 0) {
        patchCanvas.width = w
        patchCanvas.height = h
        patchCtx.putImageData(
          new ImageData(parsed.patch as Uint8ClampedArray<ArrayBuffer>, w, h),
          0,
          0,
        )
        // drawImage (unlike putImageData) keeps what shows through transparent pixels.
        ctx.drawImage(patchCanvas, left, top)
      }
      previous = { dims: parsed.dims, disposalType: parsed.disposalType, under }
      return { frame: canvas, delayMs: gifFrameDelayMs(parsed.delay) }
    },
    close() {
      canvas.width = 0
      patchCanvas.width = 0
    },
  }
}
