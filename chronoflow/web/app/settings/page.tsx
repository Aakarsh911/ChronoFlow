import { listIntegrations, connectIntegration, disconnectIntegration } from "./_actions/integrations";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import { Check, Link2, PlugZap, Plug, XCircle } from "lucide-react";

interface IntegrationRow {
  id: string;
  userId: string;
  provider: string;
  status: string;
  scopes: string | null;
  meta: any;
  createdAt: Date;
  updatedAt: Date;
}

const providers: { provider: "gcal" | "slack" | "jira" | "teams"; label: string; description: string; accent: string }[] = [
  { provider: "gcal", label: "Google Calendar", description: "Sync meetings & availability", accent: "from-blue-500 to-sky-500" },
  { provider: "slack", label: "Slack", description: "Turn messages into tasks", accent: "from-violet-500 to-fuchsia-500" },
  { provider: "jira", label: "Jira", description: "Pull assigned issues", accent: "from-blue-600 to-indigo-500" },
  { provider: "teams", label: "Microsoft Teams", description: "Messages & availability (future)", accent: "from-indigo-500 to-purple-500" },
];

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email || "";
  const connections = (await listIntegrations()) as IntegrationRow[];
  const connectedMap = new Map<string, IntegrationRow>(connections.map((c: IntegrationRow) => [c.provider, c]));

  return (
      <div className="p-10 max-w-6xl">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your account and connected tools.</p>
          <div className="flex items-center gap-4 text-sm mt-2">
            <div className="flex items-center gap-1 text-gray-600"><span className="text-gray-400">Email:</span> <span className="font-medium text-gray-800">{userEmail}</span></div>
          </div>
        </div>
        <div className="mb-5 flex items-center gap-2">
          <PlugZap className="w-4 h-4 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-800">Integrations</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {providers.map(p => {
                const existing = connectedMap.get(p.provider);
                const isConnected = Boolean(existing);
                const status = existing?.status || "disconnected";
                const dotColor = isConnected ? "bg-emerald-500" : status === 'pending' ? 'bg-yellow-400' : 'bg-gray-300';
                return (
                  <div key={p.provider} className="relative rounded-lg border bg-white hover:border-teal-300 transition-colors shadow-sm flex flex-col p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${p.accent} flex items-center justify-center text-white`}> <Plug size={16} /> </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{p.label}</h3>
                          <p className="text-[11px] text-gray-500 leading-snug">{p.description}</p>
                        </div>
                      </div>
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <span className="text-[11px] tracking-wide uppercase text-gray-500">
                        {isConnected ? 'Connected' : status === 'pending' ? 'Pending' : 'Not Connected'}
                      </span>
                      {isConnected ? (
                        <form action={async () => { 'use server'; await disconnectIntegration(p.provider as any); }}>
                          <button className="text-xs font-medium px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100">Disconnect</button>
                        </form>
                      ) : (
                        <form action={async () => { 'use server'; await connectIntegration(p.provider as any); }}>
                          <button className="text-xs font-medium px-3 py-1 rounded-md bg-teal-600 text-white hover:bg-teal-700">Connect</button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        <p className="mt-8 text-xs text-gray-400">OAuth flows coming soon.</p>
      </div>
  );
}
