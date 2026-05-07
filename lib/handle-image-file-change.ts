import { type ChangeEvent } from "react"

import { MAX_SOURCE_IMAGE_BYTES } from "./source-image-limits"

export const IMAGE_TOO_LARGE_ERROR = "Image must not exceed 5 MB"

export function handleImageFileChange(
  e: ChangeEvent<HTMLInputElement>,
  onDataUrl: (url: string | null) => void,
  setError: (msg: string) => void,
): void {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    setError(IMAGE_TOO_LARGE_ERROR)
    onDataUrl(null)
    e.target.value = ""
    return
  }
  setError("")
  const reader = new FileReader()
  reader.onload = () => onDataUrl(reader.result as string)
  reader.readAsDataURL(file)
  e.target.value = ""
}
