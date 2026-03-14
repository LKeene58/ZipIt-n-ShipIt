import { pollAllAgentHandshakes } from '../units/support/agent-handshake';

type AgentName = 'Sourcing' | 'Logistics' | 'Sales' | 'Overseer' | 'Manager' | 'Finance';

type QueueTask = {
  id: string;
  agent_name: string;
  task_description: string;
  status: string;
  priority: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type ProcessorConfig = {
  supabaseUrl: string;
  serviceKey: string;
  openaiApiKey: string;
  model: string;
};

type ProcessorResult = {
  processed: number;
  completed: number;
  failed: number;
  notes: string[];
};

const AGENT_INSTRUCTIONS: Record<AgentName, string> = {
  Sourcing:
    'You are the Sourcing Agent. Evaluate suppliers, margin feasibility, quality signals, and duplicate risks. Return a concise sourcing execution summary and recommended next action.',
  Logistics:
    'You are the Logistics Agent. Optimize shipping workflow, fulfillment readiness, carrier handoff risk, and tracking update strategy. Return concrete operational actions.',
  Sales:
    'You are the Sales Agent. Validate offer clarity, conversion readiness, and customer-impact messaging. Preserve the existing 5% protection strategy and avoid unsafe pricing changes.',
  Overseer:
    'You are the Overseer (manager layer). Validate cross-agent consistency, detect conflicts, and produce a final directive for execution priority and risk handling.',
  Manager:
    'You are the Manager role. Coordinate Sourcing, Logistics, Sales, and Finance outputs into one prioritized action plan with clear ownership.',
  Finance:
    'You are the Finance Agent. Validate margin integrity, fee math, and payout risk. Flag any task where costs or fees compromise target profitability.',
};

function getConfig(): ProcessorConfig | null {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_AGENT_MODEL ?? process.env.OPENAI_SOURCING_MODEL ?? 'gpt-4o-mini';

  if (!supabaseUrl || !serviceKey || !openaiApiKey) return null;
  return { supabaseUrl, serviceKey, openaiApiKey, model };
}

async function postgrestSelect<T>(config: ProcessorConfig, path: string): Promise<T[]> {
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return [];
    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

async function postgrestInsert(config: ProcessorConfig, table: string, rows: Record<string, unknown>[]) {
  try {
    await fetch(`${config.supabaseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(rows),
    });
  } catch {
    // Best-effort logging.
  }
}

async function patchTaskStatus(
  config: ProcessorConfig,
  taskId: string,
  status: 'Processing' | 'Completed' | 'Failed',
) {
  const body: Record<string, unknown> = { status };
  if (status === 'Completed' || status === 'Failed') {
    body.completed_at = new Date().toISOString();
  }

  await fetch(`${config.supabaseUrl}/rest/v1/task_queue?id=eq.${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

function normalizeAgent(agentName: string): AgentName {
  const normalized = agentName.trim().toLowerCase();
  if (normalized === 'sourcing') return 'Sourcing';
  if (normalized === 'logistics') return 'Logistics';
  if (normalized === 'sales') return 'Sales';
  if (normalized === 'finance') return 'Finance';
  if (normalized === 'manager') return 'Manager';
  return 'Overseer';
}

async function runAgentBrain(config: ProcessorConfig, task: QueueTask): Promise<string> {
  const agent = normalizeAgent(task.agent_name);
  const systemInstruction = AGENT_INSTRUCTIONS[agent];
  const metadataJson = JSON.stringify(task.metadata ?? {}, null, 2);

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: [
        { role: 'system', content: systemInstruction },
        {
          role: 'user',
          content:
            `Execute this queued task as the ${agent} role.\n\n` +
            `Task ID: ${task.id}\n` +
            `Priority: ${task.priority ?? 'n/a'}\n` +
            `Description: ${task.task_description}\n` +
            `Metadata:\n${metadataJson}\n\n` +
            'Return: 1) action summary, 2) execution notes, 3) risk flags, 4) final status recommendation.',
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await response.json()) as { output_text?: string };
  return (payload.output_text ?? '').trim() || 'No output returned by model.';
}

async function fetchPendingTasks(
  config: ProcessorConfig,
  limit: number,
  agentFilter?: string,
): Promise<QueueTask[]> {
  const capped = Math.min(25, Math.max(1, limit));
  const filter = agentFilter ? `&agent_name=eq.${encodeURIComponent(agentFilter)}` : '';
  return postgrestSelect<QueueTask>(
    config,
    `task_queue?select=id,agent_name,task_description,status,priority,metadata,created_at&status=eq.Pending${filter}&order=priority.desc,created_at.asc&limit=${capped}`,
  );
}

export async function runModularAgentProcessor(args?: {
  limit?: number;
  agent?: string;
}): Promise<ProcessorResult> {
  await pollAllAgentHandshakes();
  const config = getConfig();
  if (!config) {
    return {
      processed: 0,
      completed: 0,
      failed: 0,
      notes: ['Missing OPENAI_API_KEY or Supabase server configuration.'],
    };
  }

  const limit = args?.limit ?? 5;
  const tasks = await fetchPendingTasks(config, limit, args?.agent);
  if (tasks.length === 0) {
    return { processed: 0, completed: 0, failed: 0, notes: ['No pending tasks found.'] };
  }

  let completed = 0;
  let failed = 0;

  for (const task of tasks) {
    try {
      await patchTaskStatus(config, task.id, 'Processing');
      const agentOutput = await runAgentBrain(config, task);
      await patchTaskStatus(config, task.id, 'Completed');

      await postgrestInsert(config, 'agent_logs', [
        {
          task_id: task.id,
          agent_name: normalizeAgent(task.agent_name),
          action_taken: 'openai_task_execution',
          result: 'Success',
          overseer_notes: agentOutput.slice(0, 4000),
          timestamp: new Date().toISOString(),
        },
      ]);

      completed += 1;
    } catch (error) {
      await patchTaskStatus(config, task.id, 'Failed');
      const message = error instanceof Error ? error.message : 'Unknown processor error';

      await postgrestInsert(config, 'agent_logs', [
        {
          task_id: task.id,
          agent_name: normalizeAgent(task.agent_name),
          action_taken: 'openai_task_execution',
          result: 'Error',
          overseer_notes: `Task execution failed: ${message}`.slice(0, 4000),
          timestamp: new Date().toISOString(),
        },
      ]);

      failed += 1;
    }
  }

  return {
    processed: tasks.length,
    completed,
    failed,
    notes: [`Model: ${config.model}`, `Agent filter: ${args?.agent ?? 'all'}`],
  };
}
