import { describe, expect, it } from "vitest"
import {
  confirmPasswordError,
  emailError,
  firstInvalidField,
  isValidEmail,
  newPasswordError,
} from "./form-validation"

describe("emailError", () => {
  it("asks for an email when empty or blank", () => {
    expect(emailError("")).toBe("Please enter an email address")
    expect(emailError("   ")).toBe("Please enter an email address")
  })

  it("rejects addresses without a domain suffix", () => {
    expect(emailError("sam@company")).toBe("Please enter a valid email address")
    expect(isValidEmail("sam@company")).toBe(false)
  })

  it("accepts a valid address, ignoring surrounding spaces", () => {
    expect(emailError(" sam@company.com ")).toBe("")
  })
})

describe("newPasswordError", () => {
  it("requires at least 6 characters", () => {
    expect(newPasswordError("12345")).toBe(
      "Password must be at least 6 characters",
    )
    expect(newPasswordError("123456")).toBe("")
  })
})

describe("confirmPasswordError", () => {
  it("flags a mismatch", () => {
    expect(confirmPasswordError("hunter22", "hunter2")).toBe(
      "Passwords do not match",
    )
    expect(confirmPasswordError("hunter22", "hunter22")).toBe("")
  })
})

describe("firstInvalidField", () => {
  it("returns the first field with an error, in order", () => {
    expect(firstInvalidField({ email: "", password: "bad", other: "x" })).toBe(
      "password",
    )
    expect(firstInvalidField({ email: "", password: "" })).toBeUndefined()
  })
})
