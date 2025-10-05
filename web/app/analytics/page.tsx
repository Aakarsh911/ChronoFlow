import { ProtectedRoute } from "@/components/protected-route"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { MainLayout } from "@/components/main-layout"

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics</h1>
            <p className="text-muted-foreground">Insights into your productivity and performance</p>
          </div>
          <AnalyticsDashboard />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
