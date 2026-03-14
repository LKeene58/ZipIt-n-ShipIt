import { NextResponse } from 'next/server';
import { runSourcingSprint } from '../../../../../_archive/cj/cj_hydrator';
import { runModularAgentProcessor } from '../../../../../manager/modular-agent-system';

function isAuthorizedCronRequest(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const header = req.headers.get('authorization') ?? '';
  return header === `Bearer ${cronSecret}`;
}

export async function GET(req: Request) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sourcing = await runSourcingSprint();
  const processor = await runModularAgentProcessor({ limit: 30 });

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    sourcing,
    processor,
  });
}

