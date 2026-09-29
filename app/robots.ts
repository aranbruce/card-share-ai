import type { MetadataRoute } from "next"
import { buildRobots } from "@/lib/robots-rules"

export default function robots(): MetadataRoute.Robots {
  return buildRobots()
}
