import { type ChangeEvent } from "react"

import {
  MAX_SOURCE_IMAGE_BYTES,
  MAX_UPLOAD_FILE_BYTES,
} from "./source-image-limits"

export const IMAGE_TOO_LARGE_ERROR =
  "Image file is too large to upload (maximum 20 MB)"
export const IMAGE_CANNOT_COMPRESS_ERROR =
  "Image could not be compressed to fit the size limit"
export const IMAGE_READ_ERROR = "Failed to read image file"

const UPLOAD_ERRORS = new Set([
  IMAGE_TOO_LARGE_ERROR,
  IMAGE_CANNOT_COMPRESS_ERROR,
  IMAGE_READ_ERROR,
])

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Returns the highest-quality JPEG data URL that fits within MAX_SOURCE_IMAGE_BYTES, or null. */
async function compressToTarget(
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  const initial = await canvasToBlob(canvas, 0.85)
  if (initial.size <= MAX_SOURCE_IMAGE_BYTES) return blobToDataUrl(initial)

  const min = await canvasToBlob(canvas, 0.01)
  if (min.size > MAX_SOURCE_IMAGE_BYTES) return null

  // Binary search for highest quality that fits (~6 iterations → ~1.5% precision)
  let lo = 0.01
  let hi = 0.85
  let best = min
  for (let i = 0; i < 6; i++) {
    const mid = (lo + hi) / 2
    const blob = await canvasToBlob(canvas, mid)
    if (blob.size <= MAX_SOURCE_IMAGE_BYTES) {
      best = blob
      lo = mid
    } else {
      hi = mid
    }
  }
  return blobToDataUrl(best)
}

export function handleImageFileChange(
  e: ChangeEvent<HTMLInputElement>,
  onDataUrl: (url: string | null) => void,
  setError: (msg: string) => void,
  currentError = "",
): void {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_UPLOAD_FILE_BYTES) {
    setError(IMAGE_TOO_LARGE_ERROR)
    onDataUrl(null)
    e.target.value = ""
    return
  }
  // Only clear the error if it was set by a previous upload attempt
  if (UPLOAD_ERRORS.has(currentError)) setError("")
  e.target.value = ""

  // Load all formats via Image so the browser applies EXIF orientation, then
  // re-encode via canvas to JPEG — this also enables quality-based compression
  // for any format when the output would otherwise exceed the size limit.
  const objectUrl = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    URL.revokeObjectURL(objectUrl)
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setError(IMAGE_READ_ERROR)
      onDataUrl(null)
      return
    }
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)

    compressToTarget(canvas)
      .then((dataUrl) => {
        if (dataUrl) {
          onDataUrl(dataUrl)
          return
        }
        // Fallback: scale to 50% dimensions and retry
        const scaled = document.createElement("canvas")
        scaled.width = Math.round(canvas.width * 0.5)
        scaled.height = Math.round(canvas.height * 0.5)
        const sCtx = scaled.getContext("2d")
        if (!sCtx) {
          setError(IMAGE_CANNOT_COMPRESS_ERROR)
          onDataUrl(null)
          return
        }
        sCtx.fillStyle = "#ffffff"
        sCtx.fillRect(0, 0, scaled.width, scaled.height)
        sCtx.drawImage(canvas, 0, 0, scaled.width, scaled.height)
        return compressToTarget(scaled).then((scaledDataUrl) => {
          if (scaledDataUrl) {
            onDataUrl(scaledDataUrl)
          } else {
            setError(IMAGE_CANNOT_COMPRESS_ERROR)
            onDataUrl(null)
          }
        })
      })
      .catch(() => {
        setError(IMAGE_READ_ERROR)
        onDataUrl(null)
      })
  }
  img.onerror = () => {
    URL.revokeObjectURL(objectUrl)
    setError(IMAGE_READ_ERROR)
    onDataUrl(null)
  }
  img.src = objectUrl
}
