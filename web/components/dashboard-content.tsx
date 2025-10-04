"use client"

import { Calendar, Clock, Target, Users, BarChart3, Plus, Settings, LogOut, Sparkles, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession, signOut } from "next-auth/react"
import { NotificationSystem } from "@/components/notification-system"
import Link from "next/link"

export function DashboardContent() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <div className="min-h-screen bg-background">
      <header className="glass-panel sticky top-0 z-50 border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center glow-subtle-aqua">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">TimeSync AI</h1>
                <p className="text-xs text-muted-foreground">Intelligent Productivity</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 glass-panel border-accent/30 text-accent hover:glow-subtle-aqua bg-transparent"
              >
                <Zap className="w-4 h-4" />
                AI Actions
              </Button>
              <NotificationSystem />
              <Button variant="ghost" size="sm" className="glass-panel">
                <Settings className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full glass-panel">
                    <Avatar className="w-9 h-9 ring-2 ring-accent/30">
                      <AvatarImage src={user?.image || "/placeholder-user.png"} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 glass-panel" align="end" forceMount>
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      <p className="font-medium text-foreground">{user?.name}</p>
                      <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <nav className="space-y-2">
              <Button
                variant="default"
                className="w-full justify-start gap-3 bg-gradient-to-r from-primary to-accent glow-subtle-aqua"
              >
                <BarChart3 className="w-4 h-4" />
                Dashboard
              </Button>
              <Link href="/calendar" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 glass-panel hover:bg-primary/10">
                  <Calendar className="w-4 h-4" />
                  Calendar
                </Button>
              </Link>
              <Link href="/tasks" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 glass-panel hover:bg-primary/10">
                  <Target className="w-4 h-4" />
                  Tasks
                </Button>
              </Link>
              <Link href="/focus" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 glass-panel hover:bg-primary/10">
                  <Clock className="w-4 h-4" />
                  Focus Time
                </Button>
              </Link>
              <Link href="/team" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 glass-panel hover:bg-primary/10">
                  <Users className="w-4 h-4" />
                  Team
                </Button>
              </Link>
              <Link href="/analytics" className="block">
                <Button variant="ghost" className="w-full justify-start gap-3 glass-panel hover:bg-primary/10">
                  <BarChart3 className="w-4 h-4" />
                  Analytics
                </Button>
              </Link>
            </nav>

            <Card className="mt-6 glass-panel border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground">Today's Focus</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Focus Time</span>
                  <span className="text-sm font-medium text-accent">4h 30m</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tasks Done</span>
                  <span className="text-sm font-medium text-secondary">8/12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Meetings</span>
                  <span className="text-sm font-medium text-primary">3</span>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-foreground text-balance">
                  Good morning, {user?.name?.split(" ")[0] || "there"}
                </h2>
                <p className="text-muted-foreground mt-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  You have 5 tasks and 3 meetings scheduled for today
                </p>
              </div>
              <Button className="gap-2 bg-gradient-to-r from-primary to-accent glow-subtle-aqua">
                <Plus className="w-4 h-4" />
                Quick Add
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="glass-panel border-primary/30 hover:glow-subtle-aqua transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Active Focus Block</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">2h 15m</div>
                  <p className="text-xs text-muted-foreground mt-1">Deep work session</p>
                  <div className="mt-3">
                    <Badge className="text-xs bg-primary/20 text-primary border-primary/30">In Progress</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-secondary/30 hover:glow-subtle-aqua transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Next Meeting</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-secondary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-secondary">2:30 PM</div>
                  <p className="text-xs text-muted-foreground mt-1">Team Standup</p>
                  <div className="mt-3">
                    <Badge variant="outline" className="text-xs border-secondary/30 text-secondary">
                      30 min
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-accent/30 hover:glow-aqua transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Productivity Score</CardTitle>
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-accent" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-accent">87%</div>
                  <p className="text-xs text-muted-foreground mt-1">+12% from yesterday</p>
                  <div className="mt-3">
                    <Badge className="text-xs bg-accent/20 text-accent border-accent/30">Excellent</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Schedule
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Your calendar events and focus blocks for today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl ai-highlight glow-aqua">
                    <div className="w-2 h-16 bg-gradient-to-b from-accent to-primary rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <Badge className="text-xs bg-accent/20 text-accent border-accent/30">AI Suggested</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Deep Work Session</h4>
                        <span className="text-sm text-muted-foreground">9:00 - 11:00 AM</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Focus block for project development</p>
                      <Badge variant="secondary" className="mt-2 text-xs bg-primary/20 text-primary border-primary/30">
                        Focus Time
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl glass-panel border-border/50">
                    <div className="w-2 h-16 bg-secondary rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Team Standup</h4>
                        <span className="text-sm text-muted-foreground">2:30 - 3:00 PM</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Daily sync with development team</p>
                      <Badge variant="outline" className="mt-2 text-xs border-secondary/30 text-secondary">
                        Meeting
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl glass-panel border-border/50">
                    <div className="w-2 h-16 bg-destructive rounded-full"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-foreground">Client Review</h4>
                        <span className="text-sm text-muted-foreground">4:00 - 5:00 PM</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Project milestone presentation</p>
                      <Badge variant="outline" className="mt-2 text-xs border-destructive/30 text-destructive">
                        Important
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-accent" />
                  AI Quick Actions
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  AI-powered suggestions based on your schedule and habits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4 glass-panel border-primary/30 hover:glow-subtle-aqua transition-all bg-transparent"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
                      <Clock className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">Schedule Focus Block</div>
                      <div className="text-sm text-muted-foreground">2 hours available at 3 PM</div>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="justify-start gap-3 h-auto p-4 glass-panel border-accent/30 hover:glow-subtle-aqua transition-all bg-transparent"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-accent to-secondary rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-foreground">Review Pending Tasks</div>
                      <div className="text-sm text-muted-foreground">4 tasks need attention</div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </div>
  )
}
