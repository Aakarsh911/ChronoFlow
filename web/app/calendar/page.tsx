import { CalendarView } from "@/components/calendar-view"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            <p className="text-muted-foreground">Manage your schedule and events</p>
          </div>
          <CalendarView />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
