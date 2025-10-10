import { ProtectedRoute } from "@/components/protected-route"
import OutlookDashboard from "@/components/outlook-dashboard"
import { MainLayout } from "@/components/main-layout"

export default function OutlookPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <OutlookDashboard />
      </MainLayout>
    </ProtectedRoute>
  )
}
