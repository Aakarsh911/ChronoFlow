import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession({ req, ...authOptions });
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await req.json();
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      onboardingData: data,
    },
  });
  return NextResponse.json({ success: true });
}

export async function GET(req: Request) {
  const session = await getServerSession({ req, ...authOptions });
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return NextResponse.json({ onboardingCompleted: user?.onboardingCompleted, onboardingData: user?.onboardingData });
}
