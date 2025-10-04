"use client"

import { useState, useEffect } from "react"
import {
  Play,
  Pause,
  Square,
  Clock,
  Bell,
  BellOff,
  Settings,
  Zap,
  Target,
  Users,
  Timer,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

// Mock focus session data
const mockFocusSessions = [
  {
    id: 1,
    title: "Deep Work - Authentication Bug",
    duration: 120, // minutes
    completed: 85,
    status: "active",
    startTime: "9:00 AM",
    endTime: "11:00 AM",
    task: "Fix authentication bug in login flow",
    interruptions: 2,
  },
  {
    id: 2,
    title: "Code Review Session",
    duration: 60,
    completed: 60,
    status: "completed",
    startTime: "2:00 PM",
    endTime: "3:00 PM",
    task: "Review PR for new dashboard components",
    interruptions: 0,
  },
  {
    id: 3,
    title: "Documentation Writing",
    duration: 90,
    completed: 0,
    status: "scheduled",
    startTime: "4:00 PM",
    endTime: "5:30 PM",
    task: "Update API documentation",
    interruptions: 0,
  },
]

const focusPresets = [
  { name: "Pomodoro", duration: 25, break: 5 },
  { name: "Deep Work", duration: 90, break: 15 },
  { name: "Quick Focus", duration: 45, break: 10 },
  { name: "Extended", duration: 120, break: 20 },
]

export function FocusTimeControls() {
  const [activeSession, setActiveSession] = useState(mockFocusSessions[0])
  const [isRunning, setIsRunning] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState(35 * 60) // 35 minutes in seconds
  const [dndEnabled, setDndEnabled] = useState(true)
  const [selectedPreset, setSelectedPreset] = useState("Deep Work")
  const [customDuration, setCustomDuration] = useState([90])

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const getProgressPercentage = () => {
    const totalSeconds = activeSession.duration * 60
    const elapsed = totalSeconds - timeRemaining
    return (elapsed / totalSeconds) * 100
  }

  const handlePlayPause = () => {
    setIsRunning(!isRunning)
  }

  const handleStop = () => {
    setIsRunning(false)
    setTimeRemaining(activeSession.duration * 60)
  }

  const startNewSession = (preset: string, duration: number) => {
    const newSession = {
      id: Date.now(),
      title: `${preset} Session`,
      duration,
      completed: 0,
      status: "active" as const,
      startTime: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      endTime: new Date(Date.now() + duration * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      task: "Custom focus session",
      interruptions: 0,
    }
    setActiveSession(newSession)
    setTimeRemaining(duration * 60)
    setIsRunning(true)
  }

  return (
    <div className="space-y-6">
      {/* Active Focus Session */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                {activeSession.title}
              </CardTitle>
              <CardDescription>{activeSession.task}</CardDescription>
            </div>
            <Badge variant={isRunning ? "default" : "secondary"} className="gap-1">
              {isRunning ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isRunning ? "Active" : "Paused"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center">
            <div className="text-6xl font-mono font-bold text-primary mb-2">{formatTime(timeRemaining)}</div>
            <Progress value={getProgressPercentage()} className="w-full h-2 mb-4" />
            <p className="text-sm text-muted-foreground">
              {activeSession.startTime} - {activeSession.endTime} • {activeSession.duration} minutes
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="lg" onClick={handlePlayPause} className="gap-2 bg-transparent">
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? "Pause" : "Resume"}
            </Button>
            <Button variant="outline" size="lg" onClick={handleStop} className="gap-2 bg-transparent">
              <Square className="w-4 h-4" />
              Stop
            </Button>
          </div>

          {/* Focus Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Do Not Disturb</span>
              </div>
              <Switch checked={dndEnabled} onCheckedChange={setDndEnabled} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Slack Status</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                In Focus
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Interruptions</span>
              </div>
              <span className="text-sm font-bold">{activeSession.interruptions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Start Focus Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>Start a focus session with preset durations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {focusPresets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 bg-transparent"
                  onClick={() => startNewSession(preset.name, preset.duration)}
                >
                  <div className="font-medium text-sm">{preset.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {preset.duration}m focus • {preset.break}m break
                  </div>
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Custom Duration</label>
                <span className="text-sm text-muted-foreground">{customDuration[0]} minutes</span>
              </div>
              <Slider
                value={customDuration}
                onValueChange={setCustomDuration}
                max={180}
                min={15}
                step={15}
                className="w-full"
              />
              <Button
                variant="outline"
                className="w-full bg-transparent"
                onClick={() => startNewSession("Custom", customDuration[0])}
              >
                Start {customDuration[0]}m Focus Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Focus Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Focus Settings
            </CardTitle>
            <CardDescription>Configure your focus time preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Auto-start DND</div>
                  <div className="text-xs text-muted-foreground">Automatically enable do not disturb</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Update Slack Status</div>
                  <div className="text-xs text-muted-foreground">Set status to "In Focus" during sessions</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Block Calendar</div>
                  <div className="text-xs text-muted-foreground">Show as busy during focus time</div>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">Auto-reschedule</div>
                  <div className="text-xs text-muted-foreground">Move focus blocks when meetings conflict</div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Break Reminder</label>
              <Select defaultValue="15">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="20">20 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Focus Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Focus Sessions</CardTitle>
          <CardDescription>Your scheduled and completed focus blocks</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Sessions</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-3">
                {mockFocusSessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                      session.status === "active" && "bg-primary/5 border-primary/20",
                      session.status === "completed" && "bg-accent/5 border-accent/20",
                      session.status === "scheduled" && "bg-muted/30 border-border",
                    )}
                  >
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        session.status === "active" && "bg-primary",
                        session.status === "completed" && "bg-accent",
                        session.status === "scheduled" && "bg-muted-foreground",
                      )}
                    ></div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-sm">{session.title}</h4>
                        <span className="text-xs text-muted-foreground">
                          {session.startTime} - {session.endTime}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{session.task}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs">{session.duration}m</span>
                        </div>
                        {session.status === "active" && (
                          <div className="flex items-center gap-1">
                            <Progress value={session.completed} className="w-16 h-1" />
                            <span className="text-xs">{session.completed}%</span>
                          </div>
                        )}
                        {session.interruptions > 0 && (
                          <div className="flex items-center gap-1">
                            <Bell className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs">{session.interruptions} interruptions</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant={
                        session.status === "active"
                          ? "default"
                          : session.status === "completed"
                            ? "secondary"
                            : "outline"
                      }
                      className="text-xs capitalize"
                    >
                      {session.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="active" className="mt-4">
              <div className="space-y-3">
                {mockFocusSessions
                  .filter((s) => s.status === "active")
                  .map((session) => (
                    <div key={session.id} className="text-center py-8 text-muted-foreground">
                      <Timer className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Active session shown above</p>
                    </div>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <div className="space-y-3">
                {mockFocusSessions
                  .filter((s) => s.status === "completed")
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-accent/5 border border-accent/20"
                    >
                      <CheckCircle2 className="w-5 h-5 text-accent" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{session.title}</h4>
                        <p className="text-xs text-muted-foreground">{session.task}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Completed
                      </Badge>
                    </div>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            Focus Insights
          </CardTitle>
          <CardDescription>AI-powered analysis of your focus patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Optimal Focus Time</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    You're most productive during 90-minute sessions between 9-11 AM. Consider scheduling deep work
                    then.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 text-xs bg-transparent">
                    Schedule Morning Focus
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Interruption Pattern</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    You have 40% fewer interruptions when DND is enabled. Keep it on during focus sessions.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={60} className="flex-1 h-2" />
                    <span className="text-xs font-medium">60% effective</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
