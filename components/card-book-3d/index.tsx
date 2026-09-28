"use client"

import dynamic from "next/dynamic"
import { CardLoading3D } from "@/components/card-loading-3d"

/**
 * The 3D card, loaded on demand: `three` stays out of each route's initial bundle and is only
 * fetched in the browser, where the card is rendered (it needs WebGL, so there is nothing to
 * server-render). A floating placeholder card shows while it loads.
 */
export const CardBook3D = dynamic(
  () => import("./card-book-3d").then((m) => m.CardBook3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex w-full justify-center">
        <CardLoading3D label="Opening your card…" />
      </div>
    ),
  },
)

export type { CardBook3DProps, PageEditorArgs } from "./card-book-3d"
