"use client"

import { useEffect } from "react"

/**
 * Fires a single POST /api/track/visit when the page mounts, but only if the
 * URL contains UTM params. This means:
 *
 *   • Untagged direct visits (the site owner browsing, internal QA, etc.)
 *     are not recorded — no separate self-exclusion mechanism needed.
 *   • Crawlers that strip query params on the way in won't be counted.
 *   • A `cf_track_done` sessionStorage key prevents duplicate writes if the
 *     page is rerendered without a full nav (the App Router shouldn't, but
 *     this is a cheap belt-and-suspenders).
 */
export function TrackPageView({ path }: { path: string }) {
  useEffect(() => {
    if (typeof window === "undefined") return

    const params = new URLSearchParams(window.location.search)
    const source = params.get("utm_source")
    const medium = params.get("utm_medium")
    const campaign = params.get("utm_campaign")

    if (!source && !medium && !campaign) return

    const sessionKey = `cf_track_done:${path}:${source}:${medium}:${campaign}`
    try {
      if (window.sessionStorage.getItem(sessionKey)) return
      window.sessionStorage.setItem(sessionKey, "1")
    } catch {
      // sessionStorage unavailable (private mode quirks) — fall through.
    }

    const payload = {
      path,
      source,
      medium,
      campaign,
      referrer: document.referrer || null,
    }

    // Use sendBeacon when available so the request survives nav-aways
    // (someone clicks the join CTA before the fetch finishes).
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
    }).catch(() => {
      // tracking is fire-and-forget — never surface errors
    })
  }, [path])

  return null
}
