import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../lib/auth";
import { LogoutButton } from "../components/LogoutButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login?from=/dashboard');
  const email = session.user?.email ?? 'Unknown';
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p>Signed in as {email}</p>
      <LogoutButton />
    </main>
  );
}
