import { getSiteUrl, waitlistLlmsTxt } from "@/lib/waitlist-seo"

export const revalidate = 86400

export async function GET() {
  const body = waitlistLlmsTxt(getSiteUrl())

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  })
}
