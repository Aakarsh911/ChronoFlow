"use client";
import { useState, useTransition } from "react";
import { signIn } from 'next-auth/react';
import { connectIntegration, disconnectIntegration } from "./_actions/integrations";
import { PlugZap } from "lucide-react";
import { FaGoogle, FaMicrosoft } from 'react-icons/fa';
import { FiSlack, FiTrello } from 'react-icons/fi';

export interface IntegrationRow {
  id: string;
  userId: string;
  provider: string;
  status: string;
  scopes: string | null;
  meta: any;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ProviderDef { provider: "gcal" | "slack" | "jira" | "teams"; label: string; description: string; accent: string }

interface Props {
  initialConnections: IntegrationRow[];
}

const providers: ProviderDef[] = [
  { provider: "gcal", label: "Google Calendar", description: "Sync meetings & availability", accent: "from-blue-500 to-sky-500" },
  { provider: "slack", label: "Slack", description: "Turn messages into tasks", accent: "from-violet-500 to-fuchsia-500" },
  { provider: "jira", label: "Jira", description: "Pull assigned issues", accent: "from-blue-600 to-indigo-500" },
  { provider: "teams", label: "Microsoft Teams", description: "Messages & availability (future)", accent: "from-indigo-500 to-purple-500" },
];

type LocalConnection = { provider: string; status: string; optimistic?: boolean };

export default function IntegrationsGrid({ initialConnections }: Props) {
  const [connections, setConnections] = useState<LocalConnection[]>(() =>
    initialConnections.map(c => ({ provider: c.provider, status: c.status }))
  );
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isConnected = (provider: string) => connections.some(c => c.provider === provider && c.status === "connected");
  // we may add a "pending" state later; keep logic extensible

  async function toggle(provider: string) {
    if (pendingProvider) return; // simple lock
    const connected = isConnected(provider);
    // Special flow for Google Calendar: launch OAuth if connecting
    if (provider === 'gcal' && !connected) {
      signIn('google', { callbackUrl: '/settings', prompt: 'consent', access_type: 'offline' });
      return;
    }
    setPendingProvider(provider);
    // optimistic update
    setConnections(prev => {
      if (connected) {
        return prev.filter(c => c.provider !== provider);
      } else {
        return [...prev, { provider, status: "connected", optimistic: true }];
      }
    });

    startTransition(async () => {
      try {
        if (connected) {
          await disconnectIntegration(provider as any);
        } else {
          await connectIntegration(provider as any);
        }
        // success: remove optimistic flag by normalizing list via revalidation-less approach
        setConnections(prev => prev.map(c => c.provider === provider ? { ...c, optimistic: false } : c));
      } catch (e) {
        // rollback
        setConnections(prev => {
          if (connected) {
            // rollback means re-add connection (since we removed it)
            return [...prev, { provider, status: "connected" }];
          } else {
            // rollback means remove the optimistic add
            return prev.filter(c => c.provider !== provider);
          }
        });
        console.error(e);
      } finally {
        setPendingProvider(null);
      }
    });
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <PlugZap className="w-4 h-4 text-teal-600" />
        <h2 className="text-base font-semibold text-gray-800">Integrations</h2>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {providers.map(p => {
          const connected = isConnected(p.provider);
          const status: "connected" | "disconnected" = connected ? "connected" : "disconnected";
          const dotColor = connected ? "bg-emerald-500" : 'bg-gray-300';
          const busy = pendingProvider === p.provider || isPending;
          return (
            <div key={p.provider} className="relative rounded-lg border bg-white hover:border-teal-300 transition-colors shadow-sm flex flex-col p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-md bg-gradient-to-br ${p.accent} flex items-center justify-center text-white`}>{
                    p.provider === 'gcal' ? <FaGoogle className="w-5 h-5" /> :
                    p.provider === 'slack' ? <FiSlack className="w-5 h-5" /> :
                    p.provider === 'jira' ? <FiTrello className="w-5 h-5" /> :
                    p.provider === 'teams' ? <FaMicrosoft className="w-5 h-5" /> : null
                  }</div>
                  <div>
                    <h3 className="font-medium text-gray-900">{p.label}</h3>
                    <p className="text-[11px] text-gray-500 leading-snug">{p.description}</p>
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              </div>
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-[11px] tracking-wide uppercase text-gray-500">
                  {connected ? 'Connected' : 'Not Connected'}
                </span>
                <button
                  onClick={() => toggle(p.provider)}
                  disabled={busy}
                  className={`text-xs font-medium px-3 py-1 rounded-md ${connected ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-teal-600 text-white hover:bg-teal-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {busy ? (connected ? 'Disconnecting...' : (p.provider === 'gcal' ? 'Redirecting...' : 'Connecting...')) : connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
