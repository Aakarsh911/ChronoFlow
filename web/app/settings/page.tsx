"use client"

import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Slack,
  Github,
  Settings2,
  PlugZap,
  RefreshCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

type Service = "GOOGLE" | "JIRA" | "SLACK" | "TEAMS"

interface IntegrationStatus {
  provider: Service
  connected: boolean
  label: string
  description: string
}

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [integrations, setIntegrations] = useState<Record<Service, boolean>>({
    GOOGLE: false,
    JIRA: false,
    SLACK: false,
    TEAMS: false,
  })

  useEffect(() => {
    // Show simple alert on Jira connect/disconnect
    const connected = searchParams?.get("connected")
    const error = searchParams?.get("error")
    if (connected === "jira") {
      // lightweight feedback; replace with toast if desired
      console.info("Jira connected")
      router.replace("/settings")
    } else if (error?.startsWith("jira")) {
      console.warn("Jira connect error:", error)
      router.replace("/settings")
    }

    // Fetch integrations from API
    const run = async () => {
      try {
        const res = await fetch("/api/integrations", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setIntegrations((prev) => ({ ...prev, ...data }))
        }
      } catch (e) {
        // noop
      }
    }
    run()
  }, [searchParams, router])

  const services: IntegrationStatus[] = useMemo(() => [
    {
      provider: "GOOGLE",
      connected: Boolean(integrations.GOOGLE || (session as any)?.user?.email && (session as any)?.accessToken),
      label: "Google Calendar",
      description: "Sync your events and availability",
    },
    {
      provider: "JIRA",
      connected: Boolean(integrations.JIRA),
      label: "Jira",
      description: "Connect to Atlassian Jira to sync issues and plan time",
    },
    {
      provider: "SLACK",
      connected: Boolean(integrations.SLACK),
      label: "Slack",
      description: "Set focus status and receive notifications",
    },
    {
      provider: "TEAMS",
      connected: Boolean(integrations.TEAMS),
      label: "Microsoft Teams",
      description: "Update presence and see meetings",
    },
  ], [integrations, session])

  const connectJira = () => {
    window.location.href = "/api/integrations/jira/auth"
  }

  const disconnect = async (provider: Service) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/integrations/${provider.toLowerCase()}/disconnect`, { method: "POST" })
      if (res.ok) {
        setIntegrations((prev) => ({ ...prev, [provider]: false }))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProtectedRoute>
      <MainLayout>
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and connected services</p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Account
        </Badge>
      </div>

      <Card className="elevated-card">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarImage src={session?.user?.image || "/placeholder-user.png"} />
            <AvatarFallback>
              {session?.user?.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="font-medium">{session?.user?.name || "User"}</div>
            <div className="text-sm text-muted-foreground">{session?.user?.email}</div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-3">Services</h2>
        <p className="text-sm text-muted-foreground mb-6">Connect your calendars and tools to unlock the best experience.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((s) => (
            <Card key={s.provider} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="flex items-center gap-2">
                  {s.provider === "GOOGLE" && <Calendar className="w-5 h-5 text-primary" />}
                  {s.provider === "JIRA" && <PlugZap className="w-5 h-5 text-primary" />}
                  {s.provider === "SLACK" && <Slack className="w-5 h-5 text-primary" />}
                  {s.provider === "TEAMS" && <Github className="w-5 h-5 text-primary rotate-90" />}
                  {s.label}
                </CardTitle>
                {s.connected ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Connected
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not connected</Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{s.description}</p>
                <div className="flex items-center gap-3">
                  {s.provider === "JIRA" ? (
                    s.connected ? (
                      <Button variant="outline" disabled={loading} onClick={() => disconnect("JIRA")}>Disable</Button>
                    ) : (
                      <Button className="gradient-primary text-white" onClick={connectJira}>Connect</Button>
                    )
                  ) : s.provider === "GOOGLE" ? (
                    <Button variant="outline" disabled={true}>
                      {s.connected ? "Connected via Google Sign-In" : "Sign in with Google from Login"}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      Coming soon
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground">
        Need another service? Tell us what to build next.
      </div>
    </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
