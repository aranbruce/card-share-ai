/** The apps a card link can be shared to, plus the device's own share sheet. */
export type ShareApp = "whatsapp" | "messages" | "telegram" | "email" | "more"

export type ShareContent = {
  link: string
  /** Text before the link, e.g. "Sign Mira's card!" */
  message: string
  /** Subject line when shared by email. */
  emailSubject: string
}

/** Links that open each app with the message and link filled in. */
export function shareAppUrls({ link, message, emailSubject }: ShareContent) {
  const text = `${message} ${link}`
  const e = encodeURIComponent
  return {
    whatsapp: `https://wa.me/?text=${e(text)}`,
    // "?&body=" is understood by both iOS and Android Messages
    messages: `sms:?&body=${e(text)}`,
    telegram: `https://t.me/share/url?url=${e(link)}&text=${e(message)}`,
    email: `mailto:?subject=${e(emailSubject)}&body=${e(`${message}\n\n${link}`)}`,
  } satisfies Record<Exclude<ShareApp, "more">, string>
}
