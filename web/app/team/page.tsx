import { TeamScheduling } from "@/components/team-scheduling"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <TeamScheduling />
      </MainLayout>
    </ProtectedRoute>
  )
}
