/** The /cardshareai flow, as told on the homepage, install page and occasion pages. */
export const SLACK_FLOW_STEPS = [
  {
    n: "01",
    title: "Type /cardshareai in any channel",
    desc: "A form opens inline. Choose the card type, add the recipient's name, pick a tone, and drop in any context",
  },
  {
    n: "02",
    title: "Hit Create",
    desc: "AI generates a personalized headline and cover image. No prompting required",
  },
  {
    n: "03",
    title: "Card link lands in the channel",
    desc: "Share it with the team so everyone can sign, or send it straight to the recipient",
  },
] as const
