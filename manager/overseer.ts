import { pollAgentHandshake } from '../units/support/agent-handshake';

type OverseerConfig = {
  supabaseUrl: string;
  serviceKey: string;
};

type AgentLogRow = {
  task_id?: string | null;
  agent_name?: string;
  result?: string;
  timestamp?: string;
};

type QueueRow = {
  id?: string;
  agent_name?: string;
  status?: string;
  created_at?: string;
  completed_at?: string | null;
};

function getConfig(): OverseerConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return { supabaseUrl, serviceKey };
}

async function postgrestSelect<T>(config: OverseerConfig, path: string): Promise<T[]> {
 try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
      },
      cache: 'no-store',
    } as RequestInit & { cache: string });

    if (!response.ok) return [];
    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

async function postgrestInsert(
  config: OverseerConfig,
  table: string,
  rows: Record<string, unknown>[],
): Promise<{ ok: boolean; data: Record<string, unknown>[] }> {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify(rows),
    });

    const data = response.ok ? ((await response.json()) as Record<string, unknown>[]) : [];
    return { ok: response.ok, data };
  } catch {
    return { ok: false, data: [] };
  }
}

export async function overseerQueueFromSourcing(products: Array<{ name: string; sale_price: number }>) {
  const config = getConfig();
  if (!config || products.length === 0) return { queued: 0 };

  let queued = 0;
  for (const product of products) {
    const queueRows = [
      {
        agent_name: 'Sales',
        task_description: `Calculate Profit Protection (5%) for ${product.name}`,
        status: 'Pending',
        priority: 8,
        metadata: {
          source_agent: 'Sourcing',
          product_name: product.name,
          sale_price: product.sale_price,
          target_markup_percent: 5,
        },
      },
      {
        agent_name: 'Logistics',
        task_description: `Estimate shipping timing for ${product.name}`,
        status: 'Pending',
        priority: 7,
        metadata: {
          source_agent: 'Sourcing',
          product_name: product.name,
        },
      },
    ];

    const queuedRows = await postgrestInsert(config, 'task_queue', queueRows);
    if (!queuedRows.ok) continue;

    const logs = queuedRows.data.map((row) => ({
      task_id: typeof row.id === 'string' ? row.id : null,
      agent_name: 'Overseer',
      action_taken: 'coordination_triggered',
      result: 'Success',
      overseer_notes: `Triggered Sales and Logistics from Sourcing discovery for ${product.name}.`,
      timestamp: new Date().toISOString(),
    }));

    await postgrestInsert(config, 'agent_logs', logs);
    queued += queuedRows.data.length;
  }

  return { queued };
}

export async function overseerHandleShippingDelay(payload: {
  order_id: string;
  reason: string;
  eta_days?: number;
}) {
  const config = getConfig();
  if (!config) return { ok: false, reason: 'Missing Supabase config' };

  const taskInsert = await postgrestInsert(config, 'task_queue', [
    {
      agent_name: 'Sales',
      task_description: `Adjust customer notice/pricing due to shipping delay on order ${payload.order_id}`,
      status: 'Pending',
      priority: 9,
      metadata: {
        source_agent: 'Logistics',
        order_id: payload.order_id,
        reason: payload.reason,
        eta_days: payload.eta_days ?? null,
      },
    },
  ]);

  const taskId = typeof taskInsert.data[0]?.id === 'string' ? (taskInsert.data[0].id as string) : null;
  await postgrestInsert(config, 'agent_logs', [
    {
      task_id: taskId,
      agent_name: 'Overseer',
      action_taken: 'delay_conflict_resolution',
      result: 'Success',
      overseer_notes: `Logistics delay detected (${payload.reason}). Sales instructed to protect CX.`,
      timestamp: new Date().toISOString(),
    },
  ]);

  return { ok: true };
}

function computeEfficiency(agentLogs: AgentLogRow[]) {
  const grouped = new Map<string, AgentLogRow[]>();
  for (const log of agentLogs) {
    const key = log.agent_name ?? 'Unknown';
    const bucket = grouped.get(key) ?? [];
    bucket.push(log);
    grouped.set(key, bucket);
  }

  const ratings: Array<{ agent: string; successScore: number; errorRate: number; avgDurationMs: number }> = [];
  for (const [agent, logs] of grouped.entries()) {
    const total = logs.length || 1;
    const failures = logs.filter((log) => (log.result ?? '').toLowerCase() === 'error').length;
    const errorRate = failures / total;
    const successScore = Math.max(0, Math.round(100 - errorRate * 60));
    ratings.push({ agent, successScore, errorRate, avgDurationMs: 0 });
  }

  return ratings.sort((a, b) => b.successScore - a.successScore);
}

function completionMs(task: QueueRow) {
  if (!task.completed_at || !task.created_at) return null;
  const start = new Date(task.created_at).getTime();
  const end = new Date(task.completed_at).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return end - start;
}

function mergeDurationIntoRatings(
  ratings: Array<{ agent: string; successScore: number; errorRate: number; avgDurationMs: number }>,
  tasks: QueueRow[],
) {
  const byAgent = new Map<string, number[]>();
  for (const task of tasks) {
    const agent = task.agent_name;
    if (!agent) continue;
    const ms = completionMs(task);
    if (ms === null) continue;
    const arr = byAgent.get(agent) ?? [];
    arr.push(ms);
    byAgent.set(agent, arr);
  }

  return ratings.map((rating) => {
    const durations = byAgent.get(rating.agent) ?? [];
    const avgDurationMs =
      durations.length > 0 ? Math.round(durations.reduce((sum, v) => sum + v, 0) / durations.length) : 0;
    const durationPenalty = Math.min(35, avgDurationMs / 1200);
    return {
      ...rating,
      avgDurationMs,
      successScore: Math.max(0, Math.round(100 - rating.errorRate * 60 - durationPenalty)),
    };
  });
}

async function enforceAutoCorrection(config: OverseerConfig, logs: AgentLogRow[]) {
  const byAgent = new Map<string, AgentLogRow[]>();
  for (const log of logs) {
    const key = log.agent_name ?? 'Unknown';
    const arr = byAgent.get(key) ?? [];
    arr.push(log);
    byAgent.set(key, arr);
  }

  for (const [agent, agentEntries] of byAgent.entries()) {
    if (!['Sourcing', 'Logistics', 'Sales'].includes(agent)) continue;
    const recent = agentEntries.slice(0, 3);
    if (recent.length < 3) continue;
    const failedThree = recent.every((entry) => (entry.result ?? '').toLowerCase() === 'error');
    if (!failedThree) continue;

    const restartTask = await postgrestInsert(config, 'task_queue', [
      {
        agent_name: agent,
        task_description: `Restart ${agent} with revised parameters after 3 failures`,
        status: 'Pending',
        priority: 10,
        metadata: {
          initiated_by: 'Overseer',
          reason: 'three_consecutive_failures',
          revised_parameters: {
            timeout_multiplier: 1.5,
            retries: 2,
            throttle_mode: 'conservative',
          },
        },
      },
    ]);

    const taskId = typeof restartTask.data[0]?.id === 'string' ? (restartTask.data[0].id as string) : null;
    await postgrestInsert(config, 'agent_logs', [
      {
        task_id: taskId,
        agent_name: 'Overseer',
        action_taken: 'critical_alert',
        result: 'Error',
        overseer_notes: `Critical Alert: ${agent} failed 3 consecutive tasks. Restart queued.`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }
}

export async function getOverseerStatus() {
  await pollAgentHandshake('Overseer');
  const config = getConfig();
  if (!config) {
    return {
      flow: 'Offline',
      ratings: [] as Array<{ agent: string; successScore: number; errorRate: number; avgDurationMs: number }>,
      activeTasks: 0,
    };
  }

  const [queueRows, logRows] = await Promise.all([
    postgrestSelect<QueueRow>(
      config,
      'task_queue?select=id,agent_name,status,created_at,completed_at&order=created_at.desc&limit=500',
    ),
    postgrestSelect<AgentLogRow>(
      config,
      'agent_logs?select=task_id,agent_name,result,timestamp&order=timestamp.desc&limit=700',
    ),
  ]);

  await enforceAutoCorrection(config, logRows);

  const activeTasks = queueRows.filter((row) => {
    const status = (row.status ?? '').toLowerCase();
    return status === 'pending' || status === 'processing';
  }).length;

  const flow =
    activeTasks > 20 ? 'High Throughput' : activeTasks > 5 ? 'Stable Coordination' : 'Low Activity Monitoring';

  const baseRatings = computeEfficiency(logRows).filter((r) =>
    ['Sourcing', 'Logistics', 'Sales'].includes(r.agent),
  );
  const ratings = mergeDurationIntoRatings(baseRatings, queueRows);

  return { flow, ratings, activeTasks };
}

export async function runOverseerConsistencyCheck() {
  await pollAgentHandshake('Overseer');
  const config = getConfig();
  if (!config) return { checked: 0, failed: 0, notes: ['Missing Supabase config'] };

  const thresholdIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const stuckTasks = await postgrestSelect<QueueRow & { id?: string }>(
    config,
    `task_queue?select=id,agent_name,status,created_at&status=eq.Processing&created_at=lt.${encodeURIComponent(
      thresholdIso,
    )}&limit=200`,
  );

  let failed = 0;
  for (const task of stuckTasks) {
    const taskId = task.id;
    if (!taskId) continue;

    await fetch(`${config.supabaseUrl}/rest/v1/task_queue?id=eq.${encodeURIComponent(taskId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'Failed',
        completed_at: new Date().toISOString(),
      }),
    });

    await postgrestInsert(config, 'agent_logs', [
      {
        task_id: taskId,
        agent_name: 'Overseer',
        action_taken: 'consistency_check_timeout',
        result: 'Error',
        overseer_notes: `Task moved to Failed after >10 minutes in Processing state.`,
        timestamp: new Date().toISOString(),
      },
    ]);

    failed += 1;
  }

  return { checked: stuckTasks.length, failed, notes: [] as string[] };
}