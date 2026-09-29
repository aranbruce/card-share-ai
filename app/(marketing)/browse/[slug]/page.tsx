import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CategoryLandingPage } from "@/components/category-landing-page"
import { JsonLd } from "@/components/json-ld"
import { ALL_CATEGORY_SLUGS, getCategoryConfig } from "@/lib/category-pages"
import { getSiteStats } from "@/lib/site-stats"
import { buildPageMetadata } from "@/lib/site-metadata"
import { buildStatItems } from "@/lib/social-proof"
import { breadcrumbJsonLd, faqPageJsonLd } from "@/lib/structured-data"

// Regenerates hourly so the usage stats stay current.
export const revalidate = 3600

export function generateStaticParams() {
  return ALL_CATEGORY_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const config = getCategoryConfig(slug)
  if (!config) return {}

  return buildPageMetadata({
    title: config.metaTitle,
    description: config.metaDescription,
    path: `/browse/${config.slug}`,
    imageUrl: `/og/occasion/${config.slug}`,
  })
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const config = getCategoryConfig(slug)
  if (!config) notFound()
  const stats = buildStatItems(await getSiteStats())

  return (
    <>
      <JsonLd data={faqPageJsonLd(config.faqs)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Browse occasions", path: "/browse" },
          { name: config.label, path: `/browse/${config.slug}` },
        ])}
      />
      <CategoryLandingPage config={config} stats={stats} />
    </>
  )
}

export const dynamicParams = false
