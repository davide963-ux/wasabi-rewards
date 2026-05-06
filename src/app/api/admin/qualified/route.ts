/**
 * GET /api/admin/qualified
 *
 * Returns all qualified wallets grouped by tier, with streak info so admin
 * can pick winners. Different from /api/public/state because it shows full
 * wallet addresses (not shortened) and includes pending-but-not-qualified.
 */

import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { getAllByTier } from '@/lib/db';
import { TIER_ORDER, formatPct, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = Date.now();
  const result: Record<
    Tier,
    Array<{
      wallet: string;
      balance: string;
      pctBps: number;
      pct: string;
      streakDays: number;
      qualified: boolean;
      streakStartAt: string | null;
    }>
  > = { PLATINUM: [], GOLD: [], SILVER: [], BRONZE: [] };

  for (const tier of TIER_ORDER) {
    const rows = await getAllByTier(tier, 500);
    result[tier] = rows.map((w) => ({
      wallet: w.wallet,
      balance: w.balance,
      pctBps: w.pct_bps,
      pct: formatPct(w.pct_bps),
      streakDays: w.streak_start_at
        ? Math.floor((now - new Date(w.streak_start_at).getTime()) / 86400_000)
        : 0,
      qualified: w.qualified_at !== null,
      streakStartAt: w.streak_start_at,
    }));
  }

  return NextResponse.json({ tiers: result });
}
