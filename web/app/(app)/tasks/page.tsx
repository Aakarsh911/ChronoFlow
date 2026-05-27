import { TaskManagement } from "@/components/task-management"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <TaskManagement />
      </MainLayout>
    </ProtectedRoute>
  )
}
