type AgentName = 'Overseer' | 'Sourcing' | 'Logistics' | 'Sales' | 'Finance';

type HandshakeConfig = {
  supabaseUrl: string;
  serviceKey: string;
};

function getConfig(): HandshakeConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

async function pollPath(config: HandshakeConfig, path: string) {
  try {
    await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
      },
      cache: 'no-store',
    });
  } catch {
    // Best-effort synchronization poll. We intentionally swallow errors.
  }
}

export async function pollAgentHandshake(agent: AgentName) {
  const config = getConfig();
  if (!config) return;

  const mappedAgent = agent === 'Finance' ? 'Sales' : agent;
  await Promise.all([
    pollPath(
      config,
      `task_queue?select=id,agent_name,status,created_at&agent_name=eq.${encodeURIComponent(
        mappedAgent,
      )}&order=created_at.desc&limit=25`,
    ),
    pollPath(
      config,
      `agent_logs?select=id,agent_name,result,timestamp&order=timestamp.desc&limit=40`,
    ),
  ]);
}

export async function pollAllAgentHandshakes() {
  await Promise.all([
    pollAgentHandshake('Overseer'),
    pollAgentHandshake('Sourcing'),
    pollAgentHandshake('Logistics'),
    pollAgentHandshake('Sales'),
    pollAgentHandshake('Finance'),
  ]);
}
