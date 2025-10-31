import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteCache } from "@/lib/redis"
import { prisma } from "@/lib/prisma"

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const taskId = params.id
  const { status } = await request.json()

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 })
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.userId !== user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    const updatedTask = await prisma.$transaction(async (tx: any) => {
      const newCompletedAt = status === "done" && !task.completedAt ? new Date() : status !== "done" ? null : task.completedAt

      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          status,
          completedAt: newCompletedAt,
        },
      })

      await tx.taskEvent.create({
        data: {
          taskId,
          userId: user.id,
          type: "STATUS_CHANGED",
          payload: {
            from: task.status,
            to: status,
          },
        },
      })

      return updated
    })

    // Invalidate cache after status update
    const cacheKey = `tasks:${user.id}`
    await deleteCache(cacheKey)

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error(`Failed to update task ${taskId}:`, error)
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 })
  }
}
