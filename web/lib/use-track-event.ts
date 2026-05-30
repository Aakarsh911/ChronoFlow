"use client"

import { useCallback } from "react"

import { getSandboxSessionId } from "@/lib/sandbox-session"

type TrackEventOptions = {
  props?: Record<string, unknown>
  source?: string
}

export function useTrackEvent(path = "/sandbox") {
  const track = useCallback(
    (event: string, options: TrackEventOptions = {}) => {
      if (typeof window === "undefined") return

      const payload = {
        event,
        path,
        props: options.props ?? null,
        sessionId: getSandboxSessionId(),
        source: options.source ?? "sandbox",
      }

      try {
        if (navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], {
            type: "application/json",
          })
          if (navigator.sendBeacon("/api/track/event", blob)) return
        }
      } catch {
        // fall through
      }

      void fetch("/api/track/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {})
    },
    [path],
  )

  return track
}
