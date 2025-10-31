import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "../auth/[...nextauth]/route"
import { cache, cacheKeys, cacheTTL } from "@/lib/redis"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session as any)?.user?.email as string | undefined
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Check cache first
  const cacheKey = cacheKeys.integrations(user.id)
  const cachedData = await cache.get(cacheKey)
  if (cachedData) {
    console.log('✓ Returning cached integrations')
    return NextResponse.json(cachedData)
  }

  let ints: any[] = []
  try {
    // This can throw if Prisma Client wasn't regenerated/reloaded after schema change
    ints = await prisma.integration.findMany({ where: { userId: user.id } })
  } catch (e) {
    // Fallback: treat as no third-party integrations connected
    ints = []
  }
  const map: Record<string, boolean> = {}
  ints.forEach((i: any) => { map[i.provider as string] = true })

  // Consider Google connected if user has googleId
  map.GOOGLE = !!user.googleId
  
  // TEAMS is an alias for MICROSOFT in the UI
  if (map.MICROSOFT) {
    map.TEAMS = true
  }

  // Cache the result
  await cache.set(cacheKey, map, cacheTTL.integrations)
  console.log('✓ Cached integrations')

  return NextResponse.json(map)
}
