"use client"

import { RecipientViewLinkCopy } from "@/components/recipient-view-link-copy"

/** The connector's URL, read-only, with a Copy button. */
export function ConnectorUrlCopy({
  url,
  label,
}: {
  url: string
  label: string
}) {
  return (
    <RecipientViewLinkCopy
      viewLink={url}
      getViewLink={() => url}
      ariaLabel={label}
    />
  )
}
