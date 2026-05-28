import { getAllPosts } from "@/lib/blog"
import { getSiteUrl, waitlistLlmsTxt } from "@/lib/waitlist-seo"

export const revalidate = 86400

export async function GET() {
  const siteUrl = getSiteUrl()
  const posts = await getAllPosts()
  const body = waitlistLlmsTxt(
    siteUrl,
    posts.map((p) => ({ title: p.title, slug: p.slug })),
  )

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
