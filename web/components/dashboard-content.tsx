"use client"

import { Calendar, Clock, Target, Users, BarChart3, Plus, Sparkles, Zap, TrendingUp, CheckCircle, ArrowRight, Timer, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"
import { Progress } from "@/components/ui/progress"

export function DashboardContent() {
  const { data: session } = useSession()
  const user = session?.user

  return (
    <div className="p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Good morning, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-muted-foreground mt-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            You're having a productive day with 5 tasks completed and 3 meetings scheduled
          </p>
        </div>
        <Button className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all duration-200 w-fit">
          <Plus className="w-4 h-4 mr-2" />
          Quick Add
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="elevated-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Focus</p>
                <p className="text-2xl font-bold text-foreground mt-2">2h 15m</p>
                <p className="text-xs text-muted-foreground mt-1">Deep work session</p>
              </div>
              <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
                <Timer className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Activity className="w-3 h-3 mr-1" />
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="elevated-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold text-foreground mt-2">8/12</p>
                <p className="text-xs text-muted-foreground mt-1">4 remaining</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <Progress value={66} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="elevated-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Meeting</p>
                <p className="text-2xl font-bold text-foreground mt-2">2:30 PM</p>
                <p className="text-xs text-muted-foreground mt-1">Team Standup</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="outline" className="border-purple-200 text-purple-700">
                30 min
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="elevated-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Productivity</p>
                <p className="text-2xl font-bold text-foreground mt-2">87%</p>
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12% today
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                Excellent
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="elevated-card border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Calendar className="w-5 h-5 text-primary" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Your calendar events and focus blocks for today
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
                  View all
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-xl ai-highlight">
                <div className="w-2 h-16 gradient-accent rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">
                      AI Suggested
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Deep Work Session</h4>
                    <span className="text-sm text-muted-foreground">9:00 - 11:00 AM</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Focus block for project development</p>
                  <Badge className="mt-2 text-xs bg-primary/10 text-primary border-primary/20">
                    Focus Time
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                <div className="w-2 h-16 bg-purple-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Team Standup</h4>
                    <span className="text-sm text-muted-foreground">2:30 - 3:00 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Daily sync with development team</p>
                  <Badge variant="outline" className="mt-2 text-xs border-purple-200 text-purple-700">
                    Meeting
                  </Badge>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/30">
                <div className="w-2 h-16 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Client Review</h4>
                    <span className="text-sm text-muted-foreground">4:00 - 5:00 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Project milestone presentation</p>
                  <Badge variant="outline" className="mt-2 text-xs border-orange-200 text-orange-700">
                    Important
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Today's Progress */}
          <Card className="elevated-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <span className="text-sm font-semibold text-primary">4h 30m</span>
              </div>
              <Progress value={75} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tasks Done</span>
                <span className="text-sm font-semibold text-blue-600">8/12</span>
              </div>
              <Progress value={66} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meetings</span>
                <span className="text-sm font-semibold text-purple-600">2/3</span>
              </div>
              <Progress value={66} className="h-2" />
            </CardContent>
          </Card>

          {/* AI Quick Actions */}
          <Card className="elevated-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-accent" />
                AI Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-colors"
              >
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">Schedule Focus</div>
                  <div className="text-xs text-muted-foreground">2h available at 3 PM</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-colors"
              >
                <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">Review Tasks</div>
                  <div className="text-xs text-muted-foreground">4 tasks need attention</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-auto p-3 text-left hover:bg-primary/5 hover:border-primary/20 transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-foreground text-sm">View Analytics</div>
                  <div className="text-xs text-muted-foreground">Weekly report ready</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
