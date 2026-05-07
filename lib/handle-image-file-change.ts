import { type ChangeEvent } from "react"

import { MAX_SOURCE_IMAGE_BYTES } from "./source-image-limits"

export const IMAGE_TOO_LARGE_ERROR = "Image must not exceed 5 MB"

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
  if (currentError === IMAGE_TOO_LARGE_ERROR) setError("")
  const reader = new FileReader()
  reader.onload = () => onDataUrl(reader.result as string)
  reader.onerror = reader.onabort = () => {
    setError("Failed to read image file")
    onDataUrl(null)
  }
  reader.readAsDataURL(file)
  e.target.value = ""
}
