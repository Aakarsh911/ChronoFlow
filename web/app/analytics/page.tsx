import { ProtectedRoute } from "@/components/protected-route"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { BarChart3 } from "lucide-react" // Declare the BarChart3 variable

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-semibold text-foreground">TimeSync AI</h1>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-6 py-8">
          <AnalyticsDashboard />
        </div>
      </div>
    </ProtectedRoute>
  )
}
