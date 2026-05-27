import { ProtectedRoute } from "@/components/protected-route"
import UnifiedMailDashboard from "@/components/unified-mail-dashboard"
import { MainLayout } from "@/components/main-layout"

export default function MailPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="cf-mail-page">
          <UnifiedMailDashboard />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
