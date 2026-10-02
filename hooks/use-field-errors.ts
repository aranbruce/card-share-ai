"use client"

import { type FocusEvent, useState } from "react"
import { firstInvalidField } from "@/lib/form-validation"

type FieldElement = HTMLInputElement | HTMLTextAreaElement

/**
 * When to show each field's error: once the field is left with something in it, or
 * after a submit. From then on the message follows the value as it is typed, until fixed.
 *
 * `errors` is recomputed from the current values on every render ("" = valid), and
 * `ids` are the fields' element ids, used to focus the first invalid one on submit.
 */
export function useFieldErrors<K extends string>(
  errors: Record<K, string>,
  ids: Record<K, string>,
) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)

  const error = (field: K) =>
    submitted || touched.has(field) ? errors[field] : ""

  const errorId = (field: K) => `${ids[field]}-error`

  /** Props for the field: its id, blur tracking and the aria wiring to its message. */
  const fieldProps = (field: K) => {
    const message = error(field)
    return {
      id: ids[field],
      onBlur: (e: FocusEvent<FieldElement>) => {
        if (!e.currentTarget.value) return
        setTouched((prev) =>
          prev.has(field) ? prev : new Set(prev).add(field),
        )
      },
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? errorId(field) : undefined,
    }
  }

  /** Call on submit: shows every error and focuses the first invalid field. */
  const validate = () => {
    setSubmitted(true)
    const invalid = firstInvalidField(errors)
    if (invalid) document.getElementById(ids[invalid])?.focus()
    return !invalid
  }

  const reset = () => {
    setTouched(new Set())
    setSubmitted(false)
  }

  return { error, errorId, fieldProps, validate, reset }
}
