'use client';

import { useEffect, useState } from 'react';
import { Hero } from './Hero';
import { SpicyOMeter, SpicyOMeterEmpty } from './SpicyOMeter';
import { LiveTicker } from './LiveTicker';
import { TierCards } from './TierCards';
import { HowItWorks } from './HowItWorks';
import { Leaderboard } from './Leaderboard';
import { Winners, Community } from './Footer';
import type { Tier } from '@/lib/tiers';

interface PublicState {
  latestPoll: {
    finishedAt: string;
    durationMs: number;
    walletsTracked: number;
    decimals: number;
  } | null;
  currentGoal: { id: number; targetUsd: number; label: string | null } | null;
  tiers: Record<
    Tier,
    {
      qualifiedCount: number;
      leaderboard: Array<{
        wallet: string;
        balance: string;
        pctBps: number;
        pct: string;
        streakDays: number;
      }>;
    }
  >;
  winners: Array<{
    goalId: number;
    goalTargetUsd: number;
    goalLabel: string | null;
    goalReachedAt: string | null;
    tier: Tier;
    wallet: string;
    pctAtWin: string;
    streakDays: number;
    pickedAt: string;
  }>;
}

interface MarketData {
  priceUsd: number;
  marketCap: number;
}

const EMPTY_TIERS: PublicState['tiers'] = {
  PLATINUM: { qualifiedCount: 0, leaderboard: [] },
  GOLD:     { qualifiedCount: 0, leaderboard: [] },
  SILVER:   { qualifiedCount: 0, leaderboard: [] },
  BRONZE:   { qualifiedCount: 0, leaderboard: [] },
};

export function Dashboard() {
  const [state, setState] = useState<PublicState | null>(null);
  const [market, setMarket] = useState<MarketData | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadState = () =>
      fetch('/api/public/state')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && d && !d.error && setState(d as PublicState))
        .catch(() => {});

    const loadMarket = () =>
      fetch('/api/public/mcap')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && d && !d.error && setMarket(d as MarketData))
        .catch(() => {});

    loadState();
    loadMarket();
    const stateInt = setInterval(loadState, 60_000);
    const mktInt = setInterval(loadMarket, 30_000);

    return () => {
      cancelled = true;
      clearInterval(stateInt);
      clearInterval(mktInt);
    };
  }, []);

  const tiers = state?.tiers ?? EMPTY_TIERS;
  const decimals = state?.latestPoll?.decimals ?? 6;
  const lastUpdated = state?.latestPoll?.finishedAt ?? null;
  const walletsTracked = state?.latestPoll?.walletsTracked ?? 0;
  const winners = state?.winners ?? [];
  const goal = state?.currentGoal;
  const currentMcap = market?.marketCap ?? 0;
  const reached = goal ? currentMcap >= goal.targetUsd : false;

  return (
    <>
      <Hero />

      <div className="page">
        {goal ? (
          <SpicyOMeter
            current={currentMcap}
            target={goal.targetUsd}
            label={goal.label}
            reached={reached}
          />
        ) : (
          <SpicyOMeterEmpty />
        )}

        <LiveTicker tiers={tiers} walletsTracked={walletsTracked} />

        <TierCards
          tiers={tiers}
          walletsTracked={walletsTracked}
          lastUpdated={lastUpdated}
        />

        <HowItWorks />

        <Leaderboard tiers={tiers} decimals={decimals} />

        <Winners winners={winners} />

        <Community />
      </div>
    </>
  );
}
