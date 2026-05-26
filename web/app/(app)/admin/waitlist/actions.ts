"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { addInvite, isAdminEmail, revokeInvite } from "@/lib/access-list"

const PATH = "/admin/waitlist"

export type ActionResult = {
  ok: boolean
  message?: string
}

async function requireAdminEmail(): Promise<string> {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email ?? null
  if (!isAdminEmail(email)) {
    throw new Error("Forbidden: admin access only")
  }
  return email!
}

function pickEmail(formData: FormData): string {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export async function inviteAction(
  _prev: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  let admin: string
  try {
    admin = await requireAdminEmail()
  } catch (err) {
    return { ok: false, message: (err as Error).message }
  }

  const email = pickEmail(formData)
  if (!EMAIL_RE.test(email)) {
    return { ok: false, message: "Enter a valid email address." }
  }

  const { added } = await addInvite(email, { invitedBy: admin })
  revalidatePath(PATH)
  return {
    ok: true,
    message: added ? `Invited ${email}` : `${email} was already invited`,
  }
}

export async function revokeAction(formData: FormData): Promise<void> {
  await requireAdminEmail()
  const email = pickEmail(formData)
  if (!EMAIL_RE.test(email)) return
  await revokeInvite(email)
  revalidatePath(PATH)
}

export async function inviteFromWaitlistAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdminEmail()
  const email = pickEmail(formData)
  if (!EMAIL_RE.test(email)) return
  await addInvite(email, { invitedBy: admin, notes: "from waitlist" })
  revalidatePath(PATH)
}
