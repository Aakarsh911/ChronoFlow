"use client"

import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export type FocusTimerState = {
  isActive: boolean
  isRunning: boolean
  title?: string
  eventId?: string | null
  startAt?: number | null // epoch ms
  endAt?: number | null // epoch ms
  pausedRemaining?: number | null // seconds when paused
}

const initialState: FocusTimerState = {
  isActive: false,
  isRunning: false,
  title: undefined,
  eventId: null,
  startAt: null,
  endAt: null,
  pausedRemaining: null,
}

const focusTimerSlice = createSlice({
  name: "focusTimer",
  initialState,
  reducers: {
    hydrateFromCalendar: (
      state,
      action: PayloadAction<{ eventId: string; title?: string; startISO: string; endISO: string }>
    ) => {
      const { eventId, title, startISO, endISO } = action.payload
      const now = Date.now()
      const startAt = new Date(startISO).getTime()
      const endAt = new Date(endISO).getTime()
      if (now < endAt) {
        state.isActive = true
        state.isRunning = true
        state.title = title ?? state.title
        state.eventId = eventId
        state.startAt = startAt
        state.endAt = endAt
        state.pausedRemaining = null
      }
    },
    startTimer: (
      state,
      action: PayloadAction<{ durationMinutes: number; title?: string; eventId?: string | null }>
    ) => {
      const { durationMinutes, title, eventId } = action.payload
      const now = Date.now()
      const endAt = now + durationMinutes * 60 * 1000
      state.isActive = true
      state.isRunning = true
      state.title = title ?? "Focus Block"
      state.eventId = eventId ?? null
      state.startAt = now
      state.endAt = endAt
      state.pausedRemaining = null
    },
    resumeTimer: (state) => {
      if (!state.isActive) return
      const remaining =
        state.pausedRemaining ?? Math.max(0, Math.floor(((state.endAt ?? 0) - Date.now()) / 1000))
      state.isRunning = true
      state.endAt = Date.now() + remaining * 1000
      state.pausedRemaining = null
    },
    pauseTimer: (state) => {
      if (!state.isActive || !state.isRunning) return
      const remaining = Math.max(0, Math.floor(((state.endAt ?? 0) - Date.now()) / 1000))
      state.isRunning = false
      state.pausedRemaining = remaining
    },
    stopTimer: (state) => {
      state.isActive = false
      state.isRunning = false
      state.eventId = null
      state.startAt = null
      state.endAt = null
      state.pausedRemaining = null
    },
    setEventId: (state, action: PayloadAction<string | null | undefined>) => {
      state.eventId = action.payload ?? null
    },
  },
})

export const { hydrateFromCalendar, startTimer, resumeTimer, pauseTimer, stopTimer, setEventId } =
  focusTimerSlice.actions

export default focusTimerSlice.reducer
