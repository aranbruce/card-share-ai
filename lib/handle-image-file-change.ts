import { type ChangeEvent } from "react"

import {
  MAX_SOURCE_IMAGE_BASE64_CHARS,
  MAX_SOURCE_IMAGE_BYTES,
} from "./source-image-limits"

export const IMAGE_TOO_LARGE_ERROR = "Image must not exceed 3 MB"
export const IMAGE_READ_ERROR = "Failed to read image file"

const UPLOAD_ERRORS = new Set([IMAGE_TOO_LARGE_ERROR, IMAGE_READ_ERROR])

export function handleImageFileChange(
  e: ChangeEvent<HTMLInputElement>,
  onDataUrl: (url: string | null) => void,
  setError: (msg: string) => void,
  currentError = "",
): void {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    setError(IMAGE_TOO_LARGE_ERROR)
    onDataUrl(null)
    e.target.value = ""
    return
  }
  // Only clear the error if it was set by a previous upload attempt
  if (UPLOAD_ERRORS.has(currentError)) setError("")
  e.target.value = ""

  if (file.type === "image/jpeg") {
    // Re-encode JPEGs via canvas so the browser applies EXIF orientation
    // before the data URL is stored or sent to the AI.
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
      if (b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS) {
        setError(IMAGE_TOO_LARGE_ERROR)
        onDataUrl(null)
        return
      }
      onDataUrl(dataUrl)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      setError(IMAGE_READ_ERROR)
      onDataUrl(null)
    }
    img.src = objectUrl
  } else {
    // GIF, PNG, WebP etc. — read directly to preserve format and animation.
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1)
      if (b64.length > MAX_SOURCE_IMAGE_BASE64_CHARS) {
        setError(IMAGE_TOO_LARGE_ERROR)
        onDataUrl(null)
        return
      }
      onDataUrl(dataUrl)
    }
    reader.onerror = () => {
      setError(IMAGE_READ_ERROR)
      onDataUrl(null)
    }
    reader.readAsDataURL(file)
  }
}
