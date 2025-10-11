"use client"

import { useEffect, useState } from "react"
import { Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

// No dummy data — we render real Microsoft Teams members only

type TeamsMember = {
  id: string
  displayName: string
  email?: string
  jobTitle?: string
  teamIds: string[]
}

export function TeamScheduling() {
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)
  const [msTeamsMembers, setMsTeamsMembers] = useState<TeamsMember[]>([])

  useEffect(() => {
    let mounted = true
    setLoadingTeams(true)
    fetch('/api/integrations/teams/members')
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        return res.json()
      })
      .then((data) => {
        if (!mounted) return
        setMsTeamsMembers(data?.members || [])
        setTeamsError(null)
      })
      .catch((err) => {
        if (!mounted) return
        const message = (() => {
          try {
            const j = JSON.parse(err.message)
            return j?.error || err.message
          } catch {
            return err.message
          }
        })()
        setTeamsError(message)
      })
      .finally(() => mounted && setLoadingTeams(false))
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-6">
      {/* Microsoft Teams Members */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>Fetched from Microsoft Teams</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">Microsoft Teams</h4>
                {loadingTeams && <span className="text-xs text-muted-foreground">Loading…</span>}
              </div>
              {teamsError && (
                <div className="text-xs text-red-600 border border-red-200 rounded p-2 bg-red-50">
                  {teamsError}
                </div>
              )}
              {!teamsError && !loadingTeams && msTeamsMembers.length === 0 && (
                <div className="text-xs text-muted-foreground">No members found or Microsoft not connected.</div>
              )}
              {!teamsError && msTeamsMembers.length > 0 && (
                <div className="mb-1">
                  <Badge variant="outline" className="text-xs">
                    {msTeamsMembers.length} member{msTeamsMembers.length === 1 ? '' : 's'}
                  </Badge>
                </div>
              )}
              {msTeamsMembers.slice(0, 100).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback>
                      {(m.displayName || '?')
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{m.displayName}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">{m.jobTitle || 'Member'}</p>
                    {m.email && <p className="text-xs text-muted-foreground">{m.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
