import type { Metadata } from "next"
import { AssistantConnectorPage } from "@/components/assistant-connector-page"
import { ASSISTANT_PAGES } from "@/lib/assistant-pages"
import { buildPageMetadata } from "@/lib/site-metadata"
import { sitePreviewImagePath } from "@/lib/site-preview-pages"

const page = ASSISTANT_PAGES.chatgpt

export const metadata: Metadata = buildPageMetadata({
  title: page.metaTitle,
  description: page.metaDescription,
  path: page.path,
  imageUrl: sitePreviewImagePath("chatgpt"),
})

export default function ChatGptConnectorPage() {
  return <AssistantConnectorPage page={page} />
}
