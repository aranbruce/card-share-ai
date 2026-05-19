/** @vitest-environment happy-dom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  copyTextWithClipboardApi,
  tryCopyFromInputElement,
  tryCopyTextToClipboardSync,
} from "./copy-to-clipboard"

describe("copy-to-clipboard", () => {
  const originalClipboard = navigator.clipboard

  beforeEach(() => {
    vi.restoreAllMocks()
    document.execCommand = vi.fn().mockReturnValue(true)
  })

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: originalClipboard,
    })
    document.querySelectorAll("input[aria-hidden='true']").forEach((el) => {
      el.remove()
    })
  })

  it("tryCopyTextToClipboardSync uses a shared hidden field on body", () => {
    const execCommand = vi.mocked(document.execCommand)

    expect(
      tryCopyTextToClipboardSync("https://example.com/contribute/abc"),
    ).toBe(true)
    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(document.querySelectorAll("input[aria-hidden='true']")).toHaveLength(
      1,
    )
  })

  it("tryCopyTextToClipboardSync prefers a modal container", () => {
    const execCommand = vi.mocked(document.execCommand)
    const container = document.createElement("div")
    document.body.appendChild(container)

    expect(
      tryCopyTextToClipboardSync("https://example.com/view/abc", {
        copyContainer: container,
      }),
    ).toBe(true)

    expect(execCommand).toHaveBeenCalledWith("copy")
    expect(container.querySelector("input[aria-hidden='true']")).not.toBeNull()
  })

  it("tryCopyTextToClipboardSync restores nested scroll containers", () => {
    const scrollParent = document.createElement("div")
    scrollParent.style.height = "100px"
    scrollParent.style.overflow = "auto"
    const tallChild = document.createElement("div")
    tallChild.style.height = "400px"
    scrollParent.appendChild(tallChild)
    document.body.appendChild(scrollParent)
    scrollParent.scrollTop = 48

    const button = document.createElement("button")
    scrollParent.appendChild(button)

    tryCopyTextToClipboardSync("https://example.com/view/abc", {
      scrollAnchor: button,
    })

    expect(scrollParent.scrollTop).toBe(48)
  })

  it("tryCopyFromInputElement returns focus to the trigger", () => {
    const input = document.createElement("input")
    input.value = "https://example.com/view/abc"
    input.readOnly = true
    document.body.appendChild(input)
    const button = document.createElement("button")
    document.body.appendChild(button)
    button.focus()

    expect(tryCopyFromInputElement(input, button)).toBe(true)
    expect(document.activeElement).toBe(button)
  })

  it("copyTextWithClipboardApi calls writeText", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    })

    await copyTextWithClipboardApi("hello")

    expect(writeText).toHaveBeenCalledWith("hello")
  })
})
