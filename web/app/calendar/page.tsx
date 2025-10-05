import { WeeklyCalendarView } from "@/components/weekly-calendar-view"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <WeeklyCalendarView />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
