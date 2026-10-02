import { getAppUrl } from "@/lib/app-url"
import { getBrowseCategories } from "@/lib/category-pages"
import { COMPARE_CONFIGS } from "@/lib/compare-pages"
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/site-metadata"

/** `/llms.txt`: a plain summary of the site for AI assistants (see llmstxt.org). */
export function buildLlmsTxt(): string {
  const base = getAppUrl()
  const occasions = getBrowseCategories().map(
    (cat) =>
      `- [${cat.label}](${base}/browse/${cat.slug}): ${cat.metaDescription}`,
  )
  const comparisons = Object.values(COMPARE_CONFIGS).map(
    (c) => `- [${c.h1}](${base}/compare/${c.slug}): ${c.metaDescription}`,
  )

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${DEFAULT_DESCRIPTION}`,
    "",
    "How it works: describe who the card is for (or upload a photo) and AI designs the cover and drafts the opening message. Share one link and everyone signs from their own phone or laptop, with no account or app needed to sign. Funny photo templates put the person from an uploaded photo into a scene, like being knighted by a corgi or retiring to a desert island. Signers can add a GIF. Send the finished card by email or link; it opens as a 3D greeting card in any browser. Designing, signing and sending a card is free.",
    "",
    "## Main pages",
    "",
    `- [Home](${base}): what ${SITE_NAME} is and how it works`,
    `- [Browse occasions](${base}/browse): every occasion with a group card`,
    `- [Start a card](${base}/create): create a card, free`,
    `- [Slack app](${base}/slack/install): create cards with /cardshareai in Slack`,
    `- [Claude connector](${base}/claude): create, edit and add photos to cards from a chat with Claude`,
    "",
    "## Occasions",
    "",
    ...occasions,
    "",
    "## Comparisons",
    "",
    ...comparisons,
    "",
    "## Optional",
    "",
    `- [Privacy policy](${base}/privacy)`,
    `- [Terms](${base}/terms)`,
    `- [Sub-processors](${base}/subprocessors)`,
    "",
  ].join("\n")
}
