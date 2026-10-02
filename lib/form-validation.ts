// Field checks shared by the app's forms. Each returns the message to show under the
// field, or "" when the value is fine.

export const MIN_PASSWORD_LENGTH = 6

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email)
}

export function emailError(value: string): string {
  const email = value.trim()
  if (!email) return "Please enter an email address"
  if (!isValidEmail(email)) return "Please enter a valid email address"
  return ""
}

export function newPasswordError(value: string): string {
  return value.length < MIN_PASSWORD_LENGTH
    ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
    : ""
}

export function confirmPasswordError(
  password: string,
  confirm: string,
): string {
  return confirm !== password ? "Passwords do not match" : ""
}

/** The first field with an error, in the order the record lists them. */
export function firstInvalidField<K extends string>(
  errors: Record<K, string>,
): K | undefined {
  return (Object.keys(errors) as K[]).find((key) => errors[key])
}
