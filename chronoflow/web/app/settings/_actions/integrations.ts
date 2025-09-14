"use server";
import prisma from "../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { revalidatePath } from "next/cache";

const allowedProviders = ["gcal", "slack", "jira", "teams"] as const;
export type Provider = typeof allowedProviders[number];

export async function listIntegrations() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return [];
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return [];
  const rows = await prisma.integrationConnection.findMany({ where: { userId: user.id } });
  return rows;
}

export async function connectIntegration(provider: Provider) {
  if (!allowedProviders.includes(provider)) throw new Error("Unsupported provider");
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User not found");
  const existing = await prisma.integrationConnection.findFirst({ where: { userId: user.id, provider } });
  if (existing) {
    revalidatePath('/settings');
    return existing;
  }
  const created = await prisma.integrationConnection.create({ data: { userId: user.id, provider, status: "connected" } });
  revalidatePath('/settings');
  return created;
}

export async function disconnectIntegration(provider: Provider) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new Error("Unauthorized");
  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) throw new Error("User not found");
  await prisma.integrationConnection.deleteMany({ where: { userId: user.id, provider } });
  revalidatePath('/settings');
  return { ok: true };
}
