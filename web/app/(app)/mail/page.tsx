import { ProtectedRoute } from "@/components/protected-route"
import UnifiedMailDashboard from "@/components/unified-mail-dashboard"
import { MainLayout } from "@/components/main-layout"

export default function MailPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <UnifiedMailDashboard />
      </MainLayout>
    </ProtectedRoute>
  )
}
