import { TeamScheduling } from "@/components/team-scheduling"
import { ProtectedRoute } from "@/components/protected-route"
import { MainLayout } from "@/components/main-layout"

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Team</h1>
            <p className="text-muted-foreground">Collaborate and schedule with your team</p>
          </div>
          <TeamScheduling />
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
