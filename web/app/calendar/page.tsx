import { Calendar } from "@/components/ui/calendar"
import { CalendarView } from "@/components/calendar-view"
import { ProtectedRoute } from "@/components/protected-route"

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Calendar Integration</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <CalendarView />
      </div>
      </div>
    </ProtectedRoute>
  )
}
