import { listIntegrations } from "./_actions/integrations";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import IntegrationsGrid, { IntegrationRow } from "./IntegrationsGrid";

// integration providers are handled inside the client component

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || "";
  const connections = (await listIntegrations()) as IntegrationRow[];

  return (
      <div className="p-10 max-w-6xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and connected tools.</p>
          <div className="flex items-center gap-4 text-sm mt-2">
            <div className="flex items-center gap-1 text-gray-600"><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-800">{userEmail}</span></div>
          </div>
        </div>
  <IntegrationsGrid initialConnections={connections} />
      </div>
  );
}
