import { ProtectedRoute } from "@/components/protected-route"
import { DashboardContent } from "@/components/dashboard-content"
import { MainLayout } from "@/components/main-layout"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <DashboardContent />
      </MainLayout>
    </ProtectedRoute>
  )
}
