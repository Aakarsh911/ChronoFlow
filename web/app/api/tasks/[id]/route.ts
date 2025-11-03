import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { deleteCache } from "@/lib/redis"
import { prisma } from "@/lib/prisma"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const taskId = params.id

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task || task.userId !== user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Delete the task (cascade will handle related TaskEvents)
    await prisma.task.delete({
      where: { id: taskId },
    })

    // Invalidate cache after deletion
    const cacheKey = `tasks:${user.id}`
    await deleteCache(cacheKey)

    return NextResponse.json({ success: true, message: "Task deleted successfully" })
  } catch (error) {
    console.error(`Failed to delete task ${taskId}:`, error)
    return NextResponse.json({ error: "Failed to delete task" }, { status: 500 })
  }
}
