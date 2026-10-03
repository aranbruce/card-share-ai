import { describe, expect, it } from "vitest"

import {
  buildTeamsEnquiryEmail,
  getTeamsEnquiryErrors,
  teamsEnquirySchema,
} from "./teams-enquiry"

const valid = {
  name: "Alex Morgan",
  email: "alex@company.com",
  company: "Northwind",
  size: "11–50",
  interests: ["Reminders"],
}

describe("getTeamsEnquiryErrors", () => {
  it("returns no errors for a valid enquiry", () => {
    expect(getTeamsEnquiryErrors(valid)).toEqual({})
  })

  it("flags each empty required field with its own message", () => {
    expect(
      getTeamsEnquiryErrors({
        name: " ",
        email: "",
        company: "",
        size: "",
        interests: [],
      }),
    ).toEqual({
      name: "Enter your name",
      email: "Enter your work email",
      company: "Enter your company name",
      size: "Choose a team size",
    })
  })

  it("asks for a well-formed email", () => {
    expect(getTeamsEnquiryErrors({ ...valid, email: "alex@" })).toEqual({
      email: "Enter an email like name@company.com",
    })
  })

  it("explains over-long values in plain words", () => {
    expect(
      getTeamsEnquiryErrors({ ...valid, company: "a".repeat(161) }),
    ).toEqual({
      company: "Keep the company name to 160 characters or fewer",
    })
  })
})

describe("teamsEnquirySchema", () => {
  it("rejects unknown interests", () => {
    expect(
      teamsEnquirySchema.safeParse({ ...valid, interests: ["Invoice billing"] })
        .success,
    ).toBe(false)
  })
})

describe("buildTeamsEnquiryEmail", () => {
  it("escapes HTML and strips newlines from the subject", () => {
    const email = buildTeamsEnquiryEmail({
      ...valid,
      size: "11–50",
      interests: [],
      company: "<b>Evil</b>\r\nBcc: x@y.com",
    })
    expect(email.subject).not.toMatch(/[\r\n]/)
    expect(email.html).toContain("&lt;b&gt;Evil&lt;/b&gt;")
    expect(email.text).toContain("Interested in: None selected")
  })
})
