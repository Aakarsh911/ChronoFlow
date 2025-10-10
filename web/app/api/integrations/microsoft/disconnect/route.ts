import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function POST() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await prisma.integration.deleteMany({
      where: {
        userId: user.id,
        provider: "MICROSOFT",
      },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("Microsoft disconnect error:", e)
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 })
  }
}
