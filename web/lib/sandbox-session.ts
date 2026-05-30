const SESSION_KEY = "cf_sandbox_session"

export function getSandboxSessionId(): string {
  if (typeof window === "undefined") return "server"

  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY)
    if (existing) return existing

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    window.sessionStorage.setItem(SESSION_KEY, id)
    return id
  } catch {
    return `ephemeral_${Date.now()}`
  }
}
