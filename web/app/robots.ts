import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/waitlist-seo"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl()

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/waitlist", "/privacy", "/terms", "/llms.txt"],
        disallow: [
          "/admin/",
          "/api/",
          "/dashboard",
          "/calendar",
          "/tasks",
          "/mail",
          "/focus",
          "/team",
          "/analytics",
          "/settings",
          "/login",
          "/signup",
          "/access-pending",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
