/**
 * POST /api/admin/winners
 *   body: { goalId: number, tier: Tier, wallet: string }
 *
 * Records the admin's winner pick. The wallet must be qualified in that tier
 * right now. We fetch their current state from DB to avoid taking values from
 * the request body that might be stale or spoofed.
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { getWalletByAddress, pickWinner } from '@/lib/db';
import { TIER_ORDER, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { goalId?: number; tier?: string; wallet?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  const goalId = Number(body.goalId);
  const tier = String(body.tier ?? '').toUpperCase() as Tier;
  const wallet = String(body.wallet ?? '');

  if (!Number.isFinite(goalId) || goalId <= 0) {
    return NextResponse.json({ error: 'invalid goalId' }, { status: 400 });
  }
  if (!TIER_ORDER.includes(tier)) {
    return NextResponse.json({ error: 'invalid tier' }, { status: 400 });
  }
  if (!wallet || wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: 'invalid wallet' }, { status: 400 });
  }

  const w = await getWalletByAddress(wallet);
  if (!w) {
    return NextResponse.json({ error: 'wallet not tracked' }, { status: 404 });
  }
  if (w.current_tier !== tier) {
    return NextResponse.json(
      { error: `wallet is currently in tier ${w.current_tier ?? 'NONE'}, not ${tier}` },
      { status: 400 }
    );
  }
  if (!w.qualified_at) {
    return NextResponse.json({ error: 'wallet has not yet qualified (7-day duration)' }, { status: 400 });
  }

  const streakDays = w.streak_start_at
    ? Math.floor((Date.now() - new Date(w.streak_start_at).getTime()) / 86400_000)
    : 0;

  const winner = await pickWinner({
    goalId,
    tier,
    wallet: w.wallet,
    pctBps: w.pct_bps,
    balance: w.balance,
    streakDays,
  });

  return NextResponse.json({ winner });
}
