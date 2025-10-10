"use client"

import { useState, Fragment } from "react"
import {
  Users,
  Calendar,
  Plus,
  Send,
  CheckCircle2,
  MessageSquare,
  Video,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// Mock team data
const teamMembers = [
  {
    id: 1,
    name: "Sarah Chen",
    role: "Product Manager",
    avatar: "/placeholder-user.png",
    status: "available",
    timezone: "PST",
    nextFree: "Now",
    busyUntil: null,
  },
  {
    id: 2,
    name: "Mike Johnson",
    role: "Frontend Developer",
    avatar: "/placeholder-user.png",
    status: "busy",
    timezone: "EST",
    nextFree: "2:00 PM",
    busyUntil: "2:00 PM",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Designer",
    avatar: "/placeholder-user.png",
    status: "focus",
    timezone: "PST",
    nextFree: "3:30 PM",
    busyUntil: "3:30 PM",
  },
  {
    id: 4,
    name: "David Kim",
    role: "Backend Developer",
    avatar: "/placeholder-user.png",
    status: "available",
    timezone: "PST",
    nextFree: "Now",
    busyUntil: null,
  },
  {
    id: 5,
    name: "Lisa Wang",
    role: "QA Engineer",
    avatar: "/placeholder-user.png",
    status: "meeting",
    timezone: "EST",
    nextFree: "4:00 PM",
    busyUntil: "4:00 PM",
  },
]

// Mock meeting proposals
const meetingProposals = [
  {
    id: 1,
    title: "Sprint Planning",
    proposer: "Sarah Chen",
    timeSlots: [
      { time: "Tomorrow 10:00 AM", votes: 3, voters: ["Sarah Chen", "Mike Johnson", "David Kim"] },
      { time: "Tomorrow 2:00 PM", votes: 2, voters: ["Emily Rodriguez", "Lisa Wang"] },
      { time: "Friday 9:00 AM", votes: 1, voters: ["Sarah Chen"] },
    ],
    duration: 90,
    attendees: 5,
    responses: 4,
    status: "pending",
  },
  {
    id: 2,
    title: "Design Review",
    proposer: "Emily Rodriguez",
    timeSlots: [
      { time: "Today 3:00 PM", votes: 4, voters: ["Emily Rodriguez", "Sarah Chen", "Mike Johnson", "David Kim"] },
    ],
    duration: 60,
    attendees: 4,
    responses: 4,
    status: "confirmed",
  },
]

// Mock availability data for the week
const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const timeSlots = ["9:00", "10:00", "11:00", "12:00", "1:00", "2:00", "3:00", "4:00", "5:00"]

const getAvailabilityColor = (available: number, total: number) => {
  const percentage = available / total
  if (percentage >= 0.8) return "bg-accent"
  if (percentage >= 0.5) return "bg-yellow-500"
  if (percentage >= 0.2) return "bg-orange-500"
  return "bg-red-500"
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-accent"
    case "busy":
      return "bg-red-500"
    case "focus":
      return "bg-primary"
    case "meeting":
      return "bg-orange-500"
    default:
      return "bg-gray-500"
  }
}

export function TeamScheduling() {
  const [selectedMembers, setSelectedMembers] = useState<number[]>([])
  const [currentWeek, setCurrentWeek] = useState(0)
  const [newMeetingOpen, setNewMeetingOpen] = useState(false)

  const toggleMemberSelection = (memberId: number) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]))
  }

  const getTeamAvailability = (day: string, time: string) => {
    // Mock availability calculation
    const total = selectedMembers.length || teamMembers.length
    const available = Math.floor(Math.random() * total) + 1
    return { available, total }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeek((prev) => prev + (direction === "next" ? 1 : -1))
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Members</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Now</p>
                <p className="text-2xl font-bold text-accent">
                  {teamMembers.filter((m) => m.status === "available").length}
                </p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Meetings</p>
                <p className="text-2xl font-bold text-orange-500">
                  {teamMembers.filter((m) => m.status === "meeting" || m.status === "busy").length}
                </p>
              </div>
              <Video className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Proposals</p>
                <p className="text-2xl font-bold text-primary">
                  {meetingProposals.filter((p) => p.status === "pending").length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Members */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
            <CardDescription>Current availability and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50",
                  selectedMembers.includes(member.id) && "bg-primary/5 border-primary/20",
                )}
                onClick={() => toggleMemberSelection(member.id)}
              >
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={member.avatar || "/placeholder.svg"} />
                    <AvatarFallback>
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background",
                      getStatusColor(member.status),
                    )}
                  ></div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{member.name}</h4>
                    <span className="text-xs text-muted-foreground">{member.timezone}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{member.role}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs capitalize",
                        member.status === "available" && "border-accent/20 text-accent",
                        member.status === "busy" && "border-red-200 text-red-600",
                        member.status === "focus" && "border-primary/20 text-primary",
                        member.status === "meeting" && "border-orange-200 text-orange-600",
                      )}
                    >
                      {member.status}
                    </Badge>
                    {member.nextFree !== "Now" && (
                      <span className="text-xs text-muted-foreground">Free at {member.nextFree}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Team Availability Grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Team Availability
                </CardTitle>
                <CardDescription>
                  {selectedMembers.length > 0
                    ? `Showing availability for ${selectedMembers.length} selected members`
                    : "Showing availability for all team members"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigateWeek("prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-3">This Week</span>
                <Button variant="outline" size="sm" onClick={() => navigateWeek("next")}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-accent rounded"></div>
                  <span>High availability</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Medium availability</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Low availability</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>No availability</span>
                </div>
              </div>

              {/* Availability Grid */}
              <div className="grid grid-cols-6 gap-1">
                <div className="p-2"></div>
                {weekDays.map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}

                {timeSlots.map((time) => (
                  <Fragment key={time}>
                    <div className="p-2 text-xs text-muted-foreground text-right">
                      {time}
                    </div>
                    {weekDays.map((day) => {
                      const { available, total } = getTeamAvailability(day, time)
                      return (
                        <div
                          key={`${day}-${time}`}
                          className={cn(
                            "p-2 rounded cursor-pointer hover:opacity-80 transition-opacity",
                            getAvailabilityColor(available, total),
                          )}
                          title={`${available}/${total} available`}
                        >
                          <div className="text-xs text-white font-medium text-center">
                            {available}/{total}
                          </div>
                        </div>
                      )
                    })}
                  </Fragment>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meeting Proposals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meeting Proposals</CardTitle>
              <CardDescription>Proposed meetings awaiting team confirmation</CardDescription>
            </div>
            <Dialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Propose Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Propose New Meeting</DialogTitle>
                  <DialogDescription>Create a meeting proposal and collect team availability</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input id="title" placeholder="Sprint Planning" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" placeholder="Discuss upcoming sprint goals and tasks" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration</Label>
                      <Select defaultValue="60">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="type">Meeting Type</Label>
                      <Select defaultValue="video">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="video">Video Call</SelectItem>
                          <SelectItem value="in-person">In Person</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Proposed Time Slots</Label>
                    <div className="space-y-2">
                      <Input placeholder="Tomorrow 10:00 AM" />
                      <Input placeholder="Tomorrow 2:00 PM" />
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Time Slot
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setNewMeetingOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setNewMeetingOpen(false)}>Send Proposal</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="all">All Proposals</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <div className="space-y-4">
                {meetingProposals
                  .filter((p) => p.status === "pending")
                  .map((proposal) => (
                    <Card key={proposal.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-medium">{proposal.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Proposed by {proposal.proposer} • {proposal.duration} minutes
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {proposal.responses}/{proposal.attendees} responded
                              </Badge>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {proposal.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Discuss
                            </Button>
                            <Button size="sm">
                              <Send className="w-4 h-4 mr-2" />
                              Remind
                            </Button>
                          </div>
                        </div>

                        <div className="mt-4 space-y-2">
                          <h5 className="text-sm font-medium">Proposed Times:</h5>
                          {proposal.timeSlots.map((slot, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <span className="text-sm">{slot.time}</span>
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-1">
                                  {slot.voters.slice(0, 3).map((voter, i) => (
                                    <Avatar key={i} className="w-6 h-6 border-2 border-background">
                                      <AvatarFallback className="text-xs">
                                        {voter
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                  ))}
                                  {slot.voters.length > 3 && (
                                    <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                                      <span className="text-xs">+{slot.voters.length - 3}</span>
                                    </div>
                                  )}
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  {slot.votes} votes
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="confirmed" className="mt-4">
              <div className="space-y-4">
                {meetingProposals
                  .filter((p) => p.status === "confirmed")
                  .map((proposal) => (
                    <Card key={proposal.id} className="border-accent/20 bg-accent/5">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <h4 className="font-medium">{proposal.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Organized by {proposal.proposer} • {proposal.duration} minutes
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-accent/10 text-accent border-accent/20">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Confirmed
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {proposal.timeSlots[0].time}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Calendar className="w-4 h-4 mr-2" />
                              Add to Calendar
                            </Button>
                            <Button size="sm">
                              <Video className="w-4 h-4 mr-2" />
                              Join Meeting
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-4">
              <div className="space-y-4">
                {meetingProposals.map((proposal) => (
                  <Card
                    key={proposal.id}
                    className={cn(proposal.status === "confirmed" && "border-accent/20 bg-accent/5")}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <h4 className="font-medium">{proposal.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {proposal.status === "confirmed" ? "Organized" : "Proposed"} by {proposal.proposer} •{" "}
                            {proposal.duration} minutes
                          </p>
                          <Badge
                            variant={proposal.status === "confirmed" ? "default" : "secondary"}
                            className="text-xs capitalize"
                          >
                            {proposal.status === "confirmed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {proposal.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
