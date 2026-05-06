/**
 * POST /api/cron/poll
 *
 * Called every 2 minutes by cron-job.org.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */

import { NextResponse } from 'next/server';
import { runPoll } from '@/lib/poll';
import { recordPollRun } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const heliusApiKey = process.env.HELIUS_API_KEY;
  const mint = process.env.WASABI_MINT;
  if (!heliusApiKey || !mint) {
    return NextResponse.json(
      { error: 'server misconfigured: missing HELIUS_API_KEY or WASABI_MINT' },
      { status: 500 }
    );
  }

  const startedAt = new Date();
  try {
    const result = await runPoll({ heliusApiKey, mint });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('[cron/poll] error:', err);
    // Try to record the failed run so the admin sees it
    try {
      const finishedAt = new Date();
      await recordPollRun({
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        totalSupply: '0',
        decimals: 0,
        accountsScanned: 0,
        walletsTracked: 0,
        eventsNew: 0,
        eventsUpdated: 0,
        eventsReset: 0,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // ignore audit errors
    }
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
