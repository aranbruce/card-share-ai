import { type ChangeEvent } from "react"

import { MAX_SOURCE_IMAGE_BYTES } from "./source-image-limits"

export const IMAGE_TOO_LARGE_ERROR = "Image must be under 5 MB"

export function handleImageFileChange(
  e: ChangeEvent<HTMLInputElement>,
  onDataUrl: (url: string) => void,
  setError: (msg: string) => void,
): void {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    setError(IMAGE_TOO_LARGE_ERROR)
    e.target.value = ""
    return
  }
  setError("")
  const reader = new FileReader()
  reader.onload = () => onDataUrl(reader.result as string)
  reader.readAsDataURL(file)
}
