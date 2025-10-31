import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const cacheKey = `tasks:${user.id}`

  try {
    // Check cache first
    const cachedTasks = await getCache(cacheKey)
    if (cachedTasks) {
      return NextResponse.json(cachedTasks)
    }

    // Fetch from database
    const tasks = await prisma.task.findMany({
      where: { userId: user.id },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Cache for 5 minutes
    await setCache(cacheKey, tasks, 300)

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 })
  }
}
