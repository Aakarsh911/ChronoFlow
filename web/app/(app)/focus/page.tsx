import { FocusTimeControls } from "@/components/focus-time-controls"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function FocusPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <FocusTimeControls />
      </MainLayout>
    </ProtectedRoute>
  )
}
