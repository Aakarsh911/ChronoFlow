import { TaskManagement } from "@/components/task-management"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="relative min-h-screen p-6">
          <div className="relative z-10 mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-400 bg-clip-text text-transparent mb-2">
              Tasks
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Organize and track your work across all integrations</p>
          </div>
          <TaskManagement />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
