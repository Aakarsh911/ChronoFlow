import prisma from './prisma';

export async function getOnboardingStatusByEmail(email: string | null | undefined) {
  if (!email) return false;
  const user = await prisma.user.findUnique({ where: { email } });
  return !!user?.onboardingCompleted;
}
