import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/waitlist-seo"
import { getAllSlugs } from "@/lib/blog"
import { getAllAlternativeSlugs } from "@/lib/alternatives"

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()
  const lastModified = new Date()

  const blogSlugs = getAllSlugs()
  const altSlugs = getAllAlternativeSlugs()

  return [
    {
      url: siteUrl,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/waitlist`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...blogSlugs.map((slug) => ({
      url: `${siteUrl}/blog/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${siteUrl}/alternatives`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...altSlugs.map((slug) => ({
      url: `${siteUrl}/alternatives/${slug}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${siteUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ]
}
