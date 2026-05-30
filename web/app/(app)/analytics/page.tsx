import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { MainLayout } from "@/components/main-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="cf-page-shell">
          <div className="cf-page-inner">
            <AnalyticsDashboard />
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
