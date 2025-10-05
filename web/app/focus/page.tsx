import { FocusTimeControls } from "@/components/focus-time-controls"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function FocusPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Focus Time</h1>
            <p className="text-muted-foreground">Deep work sessions and productivity tracking</p>
          </div>
          <FocusTimeControls />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
