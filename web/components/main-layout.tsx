"use client"

import { useEffect, useState } from "react"
import {
  BarChart3,
  Calendar,
  Clock,
  Home,
  LogOut,
  Mail,
  Menu,
  Settings,
  Target,
  Users,
  X,
  Zap,
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import { AppLogo } from "@/components/app-logo"
import AIChatDrawer from "@/components/ai-chat-drawer"
import { NotificationDropdown } from "@/components/notification-dropdown"
import { ThemeToggle } from "@/app/waitlist/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface MainLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Calendar", href: "/calendar", icon: Calendar },
  { title: "Tasks", href: "/tasks", icon: Target },
  { title: "Mail", href: "/mail", icon: Mail },
  { title: "Focus", href: "/focus", icon: Clock },
  { title: "Team", href: "/team", icon: Users },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
]

export function MainLayout({ children }: MainLayoutProps) {
  const { data: session } = useSession()
  const user = session?.user
  const pathname = usePathname()
  const currentPage = navigationItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  )
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [aiChatOpen, setAiChatOpen] = useState(false)
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
        const count = Array.isArray(data)
          ? data.filter((t: { status?: string }) => t.status !== "Done").length
          : 0
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
    <TooltipProvider delayDuration={300}>
      <div className="relative min-h-screen">
        <div className="pointer-events-none fixed inset-0 cf-grid opacity-70" aria-hidden />
        <div className="pointer-events-none fixed inset-x-0 top-0 h-[420px] cf-glow" aria-hidden />

        <aside
          className={cn(
            "cf-app-sidebar transition-transform duration-300 ease-out lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-full flex-col">
            <Link
              href="/dashboard"
              className="flex h-[65px] flex-col items-center justify-center gap-1 border-b border-[var(--cf-border)] px-2"
              aria-label="ChronoFlow home"
            >
              <AppLogo size="sm" />
              <span className="font-mono text-[9px] font-semibold tracking-tight text-[var(--cf-text-muted)]">
                chronoflow
              </span>
            </Link>

            <nav className="mt-4 flex flex-1 flex-col gap-1 px-2">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon
                const badge =
                  item.href === "/tasks" && taskCount && taskCount > 0
                    ? String(taskCount)
                    : null

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn("cf-app-nav-item relative", isActive && "is-active")}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <div className="relative">
                          <Icon className="h-5 w-5 shrink-0" />
                          {badge && (
                            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgba(var(--cf-accent-rgb),1)] px-0.5 text-[9px] font-bold text-white">
                              {badge}
                            </span>
                          )}
                        </div>
                        <span>{item.title}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                )
              })}
            </nav>

            <div className="px-2 py-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="cf-app-ai-btn"
                    onClick={() => setAiChatOpen(true)}
                    aria-label="Ask ChronoFlow"
                  >
                    <Zap className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Ask ChronoFlow</p>
                  <p className="text-xs text-muted-foreground">Cross-tool actions</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="border-t border-[var(--cf-border)] p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-center rounded-lg p-2 transition hover:bg-[var(--cf-bg-soft)]"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-9 w-9 border border-[var(--cf-border)]">
                      <AvatarImage src={user?.image || "/placeholder-user.png"} />
                      <AvatarFallback className="bg-[var(--cf-accent-soft)] text-xs text-[var(--cf-text)]">
                        {user?.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" sideOffset={8}>
                  <div className="p-2">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="cursor-pointer text-destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        <div className="relative lg:pl-20">
          <header className="cf-app-header">
            <div className="flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label={sidebarOpen ? "Close menu" : "Open menu"}
                >
                  {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </Button>
                <p className="hidden text-sm text-[var(--cf-text-muted)] md:block">
                  {currentPage ? (
                    <span className="font-medium text-[var(--cf-text)]">{currentPage.title}</span>
                  ) : (
                    <>
                      Welcome back,{" "}
                      <span className="font-medium text-[var(--cf-text)]">
                        {user?.name?.split(" ")[0] || "there"}
                      </span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <NotificationDropdown />
                <Link href="/settings">
                  <Button variant="ghost" size="sm" aria-label="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="cf-app-content min-h-[calc(100vh-57px)] overflow-x-hidden">{children}</main>
        </div>

        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <AIChatDrawer isOpen={aiChatOpen} onClose={() => setAiChatOpen(false)} />
      </div>
    </TooltipProvider>
  )
}
