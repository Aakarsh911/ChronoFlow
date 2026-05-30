"use client"

import { CheckCircle2, Circle, Mail, Sparkles } from "lucide-react"
import { format, parseISO } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { useSandbox } from "@/components/sandbox/sandbox-context"
import { cn } from "@/lib/utils"

const sourceLabels: Record<string, string> = {
  EMAIL_AI: "Email (AI)",
  MANUAL: "Manual",
  JIRA: "Jira",
  TEAMS: "Teams",
}

export function SandboxTasksView() {
  const sandbox = useSandbox()
  if (!sandbox) return null

  const openTasks = sandbox.tasks.filter((t) => t.status !== "Done")
  const doneTasks = sandbox.tasks.filter((t) => t.status === "Done")

  const toggle = (id: string, current: string) => {
    const next = current === "Done" ? "To Do" : "Done"
    sandbox.setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: next } : t)),
    )
  }

  return (
    <div className="cf-page-shell">
      <div className="cf-page-inner space-y-5">
        <PageHeader
          title="Tasks"
          subtitle={`${openTasks.length} open · ${doneTasks.length} done · sample data`}
          actions={
            !sandbox.mailExtracted ? (
              <Button
                size="sm"
                className="cf-btn-primary gap-2"
                onClick={() => sandbox.navigate("mail")}
              >
                <Sparkles className="h-4 w-4" />
                Extract from mail
              </Button>
            ) : undefined
          }
        />

        <div className="cf-surface-card overflow-hidden">
          <ul className="divide-y divide-[var(--cf-border)]">
            {sandbox.tasks.map((task) => {
              const done = task.status === "Done"
              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => toggle(task.id, task.status)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--cf-bg-soft)]"
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[rgb(74,222,128)]" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--cf-text-dim)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[15px] font-medium",
                          done ? "text-[var(--cf-text-dim)] line-through" : "text-[var(--cf-text)]",
                        )}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="mt-0.5 text-sm text-[var(--cf-text-muted)]">{task.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="gap-1 font-mono text-[10px]">
                          {task.source === "EMAIL_AI" ? (
                            <Mail className="h-3 w-3" />
                          ) : null}
                          {sourceLabels[task.source] ?? task.source}
                        </Badge>
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-mono text-[10px]",
                              task.priority === "High" && "border-red-200 text-red-600",
                            )}
                          >
                            {task.priority}
                          </Badge>
                        )}
                        {task.dueDate && (
                          <span className="font-mono text-[10px] text-[var(--cf-text-dim)]">
                            Due {format(parseISO(task.dueDate), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
