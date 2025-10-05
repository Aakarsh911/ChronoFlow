import { ProtectedRoute } from "@/components/protected-route"
import { DashboardContent } from "@/components/dashboard-content"
import { MainLayout } from "@/components/main-layout"

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <DashboardContent />
      </MainLayout>
    </ProtectedRoute>
  )
}
