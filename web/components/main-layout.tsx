"use client"

import { useEffect, useState } from "react"
import { 
  Calendar, 
  Clock, 
  Target, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut, 
  Sparkles, 
  Zap,
  Menu,
  X,
  Home,
  Plus,
  ChevronRight,
  Mail
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession, signOut } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { NotificationDropdown } from "@/components/notification-dropdown"

interface MainLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
    badge: null
  },
  {
    title: "Calendar",
    href: "/calendar",
    icon: Calendar,
    badge: null
  },
  {
    title: "Tasks",
    href: "/tasks",
    icon: Target,
    badge: null
  },
  {
    title: "Mail",
    href: "/mail",
    icon: Mail,
    badge: null
  },
  {
    title: "Focus",
    href: "/focus",
    icon: Clock,
    badge: null
  },
  {
    title: "Team",
    href: "/team",
    icon: Users,
    badge: null
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    badge: null
  },
]

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()
  const user = session?.user
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [taskCount, setTaskCount] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()
    const load = async () => {
      try {
        const res = await fetch("/api/tasks", { cache: "no-store", signal: controller.signal })
        if (!res.ok) {
          if (isMounted) setTaskCount(0)
          return
        }
        const data = await res.json()
        const count = Array.isArray(data) ? data.filter((t: any) => t.status !== "Done").length : 0
        if (isMounted) setTaskCount(count)
      } catch {
        if (isMounted) setTaskCount(0)
      }
    }
    load()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-20 bg-white border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-[65px] border-b border-border">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 space-y-1 mt-6">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              const dynamicBadge = item.href === "/tasks" ? (taskCount && taskCount > 0 ? String(taskCount) : null) : item.badge
              
              return (
                <Link key={item.href} href={item.href}>
                  <div 
                    className={cn(
                      "sidebar-nav-item group flex flex-col items-center justify-center px-2 py-3 rounded-lg text-sm font-medium cursor-pointer relative",
                      isActive 
                        ? "active bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className="relative">
                      <Icon className={cn(
                        "w-5 h-5 shrink-0", 
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      {dynamicBadge && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-[9px] font-bold text-white">{dynamicBadge}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium mt-1">
                      {item.title}
                    </span>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* AI Actions */}
          <div className="px-2 py-4">
            <Button 
              size="icon"
              className="w-full h-12 gradient-primary text-white shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Zap className="w-5 h-5" />
            </Button>
          </div>

          {/* User Profile */}
          <div className="p-2 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user?.image || "/placeholder-user.png"} />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {user?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 elevated-card" align="start" sideOffset={8}>
                <div className="p-2">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-20">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              
              {/* Breadcrumb could go here */}
              <div className="hidden md:block">
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.name?.split(" ")[0] || "there"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                <Plus className="w-4 h-4" />
                Quick Add
              </Button>
              
              <NotificationDropdown />

              <Link href="/settings">
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-screen bg-background">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
