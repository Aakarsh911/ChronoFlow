import { ProtectedRoute } from "@/components/protected-route"
import GmailDashboard from "@/components/gmail-dashboard"
import { MainLayout } from "@/components/main-layout"

export default function GmailPage() {
  return (
    <ProtectedRoute>
      <MainLayout>
        <GmailDashboard />
      </MainLayout>
    </ProtectedRoute>
  )
}
