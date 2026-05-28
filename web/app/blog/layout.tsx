import { blogPageMetadata } from "@/lib/blog-seo"
import "@/app/waitlist/waitlist.css"

export const metadata = blogPageMetadata()

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children
}
