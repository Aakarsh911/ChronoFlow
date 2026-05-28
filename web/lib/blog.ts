import type { ReactNode } from "react"

export interface BlogSection {
  id: string
  title: string
}

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string        // ISO date string e.g. "2025-05-27"
  tags: string[]
  author: string
  readTime: string    // e.g. "8 min"
  sections?: BlogSection[]
  content: () => ReactNode
}

// Registry of all posts — add new posts here
const postModules: Record<string, () => Promise<{ default: BlogPost }>> = {
  "syncing-google-and-microsoft-calendars-programmatically": () =>
    import("@/content/blog/syncing-google-and-microsoft-calendars-programmatically"),
  "stop-losing-action-items-in-your-inbox": () =>
    import("@/content/blog/stop-losing-action-items-in-your-inbox"),
  "scheduling-across-google-and-microsoft-teams": () =>
    import("@/content/blog/scheduling-across-google-and-microsoft-teams"),
}

export async function getAllPosts(): Promise<Omit<BlogPost, "content">[]> {
  const posts = await Promise.all(
    Object.keys(postModules).map(async (slug) => {
      const mod = await postModules[slug]()
      const { content: _content, ...meta } = mod.default
      return meta
    })
  )

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  if (!postModules[slug]) return null
  const mod = await postModules[slug]()
  return mod.default
}

export function getAllSlugs(): string[] {
  return Object.keys(postModules)
}
