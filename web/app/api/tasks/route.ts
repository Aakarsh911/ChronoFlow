import { NextResponse, NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, invalidateCache } from "@/lib/redis"

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

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await request.json()
    const { title, description, priority, source, status, dueDate } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 })
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || "Medium",
        source: source || "MANUAL",
        status: status || "To Do",
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    })

    // Invalidate cache
    const cacheKey = `tasks:${user.id}`
    await invalidateCache(cacheKey)

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Failed to create task:", error)
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 })
  }
}
