import { TaskManagement } from "@/components/task-management"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Tasks</h1>
            <p className="text-muted-foreground">Organize and track your work</p>
          </div>
          <TaskManagement />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
