/**
 * GET /api/public/state
 *
 * One-shot endpoint that returns everything the public page renders.
 * Explicitly disables all caching (route + CDN) so we always read fresh DB.
 */

import { NextResponse } from 'next/server';
import {
  getLatestPollRun,
  getQualifiedByTier,
  getCurrentGoal,
  listAllWinners,
} from '@/lib/db';
import { TIER_ORDER, formatPct, type Tier } from '@/lib/tiers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const LEADERBOARD_LIMIT = 25;

export async function GET() {
  try {
    const [latestRun, currentGoal, winners] = await Promise.all([
      getLatestPollRun(),
      getCurrentGoal(),
      listAllWinners(),
    ]);

    const tiersData = await Promise.all(
      TIER_ORDER.map(async (tier) => {
        const qualified = await getQualifiedByTier(tier, LEADERBOARD_LIMIT);
        return { tier, qualified };
      })
    );

    const tiers: Record<Tier, {
      qualifiedCount: number;
      leaderboard: Array<{
        wallet: string;
        balance: string;
        pctBps: number;
        pct: string;
        streakDays: number;
      }>;
    }> = {
      PLATINUM: { qualifiedCount: 0, leaderboard: [] },
      GOLD:     { qualifiedCount: 0, leaderboard: [] },
      SILVER:   { qualifiedCount: 0, leaderboard: [] },
      BRONZE:   { qualifiedCount: 0, leaderboard: [] },
    };

    const now = Date.now();
    for (const { tier, qualified } of tiersData) {
      tiers[tier].qualifiedCount = qualified.length;
      tiers[tier].leaderboard = qualified.slice(0, LEADERBOARD_LIMIT).map((w) => ({
        wallet: w.wallet,
        balance: w.balance,
        pctBps: w.pct_bps,
        pct: formatPct(w.pct_bps),
        streakDays: w.streak_start_at
          ? Math.floor((now - new Date(w.streak_start_at).getTime()) / 86400_000)
          : 0,
      }));
    }

    const response = NextResponse.json({
      latestPoll: latestRun
        ? {
            finishedAt: latestRun.finished_at,
            durationMs: latestRun.duration_ms,
            walletsTracked: latestRun.wallets_tracked,
            decimals: latestRun.decimals,
          }
        : null,
      currentGoal: currentGoal
        ? {
            id: currentGoal.id,
            targetUsd: parseFloat(currentGoal.target_usd),
            label: currentGoal.label,
          }
        : null,
      tiers,
      winners: winners.map((w) => ({
        goalId: w.goal_id,
        goalTargetUsd: parseFloat(w.goal.target_usd),
        goalLabel: w.goal.label,
        goalReachedAt: w.goal.reached_at,
        tier: w.tier,
        wallet: w.wallet,
        pctAtWin: formatPct(w.pct_bps_at_win),
        streakDays: w.streak_days,
        pickedAt: w.picked_at,
      })),
    });

    // Force fresh response on every request — no CDN caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('CDN-Cache-Control', 'no-store');
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return response;
  } catch (err) {
    console.error('[public/state] error:', err);
    return NextResponse.json(
      { error: 'internal server error' },
      { status: 500 }
    );
  }
}
