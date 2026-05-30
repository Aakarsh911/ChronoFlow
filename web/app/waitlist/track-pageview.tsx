"use client"

import { useEffect } from "react"

/**
 * Fires a single POST /api/track/visit when the page mounts.
 * Records all visits (UTM-tagged or direct). Respects cf_no_track cookie.
 */
export function TrackPageView({ path }: { path: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      if (document.cookie.includes("cf_no_track=1")) return
    } catch {
      // ignore
    }

    const params = new URLSearchParams(window.location.search)
    const source = params.get("utm_source")
    const medium = params.get("utm_medium")
    const campaign = params.get("utm_campaign")

    const sessionKey = `cf_track_done:${path}:${source ?? ""}:${medium ?? ""}:${campaign ?? ""}`
    try {
      if (window.sessionStorage.getItem(sessionKey)) return
      window.sessionStorage.setItem(sessionKey, "1")
    } catch {
      // sessionStorage unavailable — fall through
    }

    const payload = {
      path,
      source,
      medium,
      campaign,
      referrer: document.referrer || null,
    }

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], {
          type: "application/json",
        })
        const ok = navigator.sendBeacon("/api/track/visit", blob)
        if (ok) return
      }
    } catch {
      // fall through to fetch
    }

    void fetch("/api/track/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }, [path])

  return null
}
