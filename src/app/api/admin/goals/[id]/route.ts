/**
 * PATCH  /api/admin/goals/:id
 *   body: { setCurrent?: boolean, markReached?: boolean, reachedMcap?: number }
 * DELETE /api/admin/goals/:id
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { deleteGoal, markGoalReached, setCurrentGoal } from '@/lib/db';
import { fetchMarketSnapshot } from '@/lib/dexscreener';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function requireAuth() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return null;
}

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  let body: { setCurrent?: boolean; markReached?: boolean; reachedMcap?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (body.setCurrent) {
    await setCurrentGoal(id);
  }

  if (body.markReached) {
    let mcap = body.reachedMcap;
    if (mcap == null || !Number.isFinite(mcap)) {
      // Auto-fetch from DexScreener if admin didn't supply
      try {
        const pair = process.env.DEXSCREENER_PAIR;
        if (pair) {
          const snap = await fetchMarketSnapshot(pair);
          mcap = snap.marketCap || snap.fdv || 0;
        }
      } catch {
        mcap = 0;
      }
    }
    await markGoalReached(id, Number(mcap ?? 0));
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAuth();
  if (guard) return guard;

  const id = parseInt(ctx.params.id, 10);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  await deleteGoal(id);
  return NextResponse.json({ ok: true });
}
