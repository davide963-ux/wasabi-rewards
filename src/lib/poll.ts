/**
 * Polling worker — runs every 2 minutes via cron-job.org.
 *
 * Algorithm:
 *   1. Fetch current supply + all current holders from Helius
 *   2. Aggregate token accounts by owner, applying exclusions (LP wallets etc.)
 *   3. Load previously-known wallets from DB into memory
 *   4. For each wallet that EITHER appears in the current snapshot OR is in DB:
 *      decide its new state by applying streak rules
 *   5. Bulk-upsert all changed wallets in one DB call
 *   6. Record an audit row to poll_runs
 *
 * Streak rules (as agreed):
 *   - If wallet's current pct_bps < 35 (below 0.35%):
 *       new state has current_tier = NULL, streak_start_at = NULL, qualified_at = NULL
 *       (timer is reset; if they re-enter later, it's a fresh streak)
 *   - If wallet's pct_bps ≥ 35 and they had no previous streak (or were below):
 *       streak_start_at = now, qualified_at = NULL
 *   - If wallet's pct_bps ≥ 35 and they already had a streak:
 *       streak_start_at = unchanged
 *       qualified_at = streak_start_at + 7d if 7d has passed, else NULL
 *   - current_tier is always determined by the pct_bps right now (no
 *     "lowest reached during streak" logic — user chose simple version)
 */

import { HeliusClient, type TokenAccount } from './helius';
import {
  classifyTier,
  computePctBps,
  DURATION_MS,
  MIN_TIER_BPS,
  type Tier,
} from './tiers';
import {
  bulkUpsertWallets,
  getAllTrackedWallets,
  getExtraExclusions,
  recordPollRun,
  type WalletUpsert,
} from './db';
import { DEFAULT_EXCLUDED_OWNERS, SYSTEM_OWNERS } from './exclusions';

interface CachedSupply {
  totalSupply: bigint;
  decimals: number;
  fetchedAt: number;
}

let _supplyCache: { mint: string; data: CachedSupply } | null = null;
const SUPPLY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getSupplyCached(client: HeliusClient, mint: string) {
  const now = Date.now();
  if (
    _supplyCache &&
    _supplyCache.mint === mint &&
    now - _supplyCache.data.fetchedAt < SUPPLY_CACHE_TTL_MS
  ) {
    return _supplyCache.data;
  }
  const supply = await client.getTokenSupply(mint);
  const data: CachedSupply = {
    totalSupply: BigInt(supply.amount),
    decimals: supply.decimals,
    fetchedAt: now,
  };
  _supplyCache = { mint, data };
  return data;
}

export interface PollResult {
  pollRunId: number;
  startedAt: string;
  durationMs: number;
  totalSupply: string;
  decimals: number;
  accountsScanned: number;
  walletsTracked: number;
  byTier: Record<Tier, { count: number; qualified: number }>;
  events: { new: number; updated: number; reset: number };
}

export async function runPoll(args: {
  heliusApiKey: string;
  mint: string;
}): Promise<PollResult> {
  const startedAt = new Date();
  const start = startedAt.getTime();
  const client = new HeliusClient(args.heliusApiKey);

  // Build the exclusion set (defaults + admin-added).
  const extra = await getExtraExclusions();
  const excludedOwners = new Set<string>([
    ...DEFAULT_EXCLUDED_OWNERS,
    ...SYSTEM_OWNERS,
    ...extra,
  ]);

  // Step 1: total supply (cached for an hour).
  const { totalSupply, decimals } = await getSupplyCached(client, args.mint);
  if (totalSupply === 0n) {
    throw new Error('Total supply is zero — refusing to poll');
  }

  // Step 2: paginate, aggregate by owner, skip exclusions.
  const balanceByOwner = new Map<string, bigint>();
  let accountsScanned = 0;

  for await (const page of client.iterateTokenAccounts(args.mint)) {
    accountsScanned += page.length;
    for (const acct of page as TokenAccount[]) {
      if (excludedOwners.has(acct.owner)) continue;
      const amt = BigInt(String(acct.amount));
      if (amt === 0n) continue;
      const prev = balanceByOwner.get(acct.owner) ?? 0n;
      balanceByOwner.set(acct.owner, prev + amt);
    }
  }

  // Step 3: load previous state.
  const previous = await getAllTrackedWallets();

  // Step 4: build the upsert list.
  // Universe = (wallets currently above MIN_TIER_BPS) ∪ (previously tracked wallets).
  // Anyone in previous but not in the new universe: their balance is now 0
  // (or below threshold) so we mark them inactive.
  const upserts: WalletUpsert[] = [];
  let eventsNew = 0;
  let eventsUpdated = 0;
  let eventsReset = 0;
  const byTier: Record<Tier, { count: number; qualified: number }> = {
    PLATINUM: { count: 0, qualified: 0 },
    GOLD: { count: 0, qualified: 0 },
    SILVER: { count: 0, qualified: 0 },
    BRONZE: { count: 0, qualified: 0 },
  };

  // Combined wallet set for iteration
  const allWallets = new Set<string>([
    ...balanceByOwner.keys(),
    ...previous.keys(),
  ]);

  const nowIso = startedAt.toISOString();

  for (const wallet of allWallets) {
    const balance = balanceByOwner.get(wallet) ?? 0n;
    const pctBps = computePctBps(balance, totalSupply);
    const tier = classifyTier(pctBps);
    const prev = previous.get(wallet);

    // Case A: wallet is below the minimum threshold now
    if (tier === null) {
      // If they were tracked before, this is a streak reset event.
      // We *only* upsert if they were previously tracked AND had a streak —
      // otherwise (never seen before, still not eligible) we don't bother.
      if (prev && prev.current_tier !== null) {
        upserts.push({
          wallet,
          balance: balance.toString(),
          pct_bps: pctBps,
          current_tier: null,
          streak_start_at: null,
          qualified_at: null,
        });
        eventsReset++;
      }
      continue;
    }

    // Case B: wallet is in some tier range now.
    let streak_start_at: string;
    let qualified_at: string | null;

    if (!prev || prev.current_tier === null) {
      // New entry into the tracking set: brand-new streak.
      streak_start_at = nowIso;
      qualified_at = DURATION_MS === 0 ? nowIso : null;
      eventsNew++;
    } else if (prev.current_tier !== tier) {
      // Wallet moved between tier ranges — reset the streak so its
      // classification matches its CURRENT range, not a stale one.
      streak_start_at = nowIso;
      qualified_at = DURATION_MS === 0 ? nowIso : null;
      eventsUpdated++;
    } else {
      // Same tier as before — continuing streak.
      streak_start_at = prev.streak_start_at ?? nowIso;
      const elapsed = start - new Date(streak_start_at).getTime();
      qualified_at = elapsed >= DURATION_MS
        ? prev.qualified_at ?? new Date(new Date(streak_start_at).getTime() + DURATION_MS).toISOString()
        : null;
      eventsUpdated++;
    }

    upserts.push({
      wallet,
      balance: balance.toString(),
      pct_bps: pctBps,
      current_tier: tier,
      streak_start_at,
      qualified_at,
    });

    byTier[tier].count++;
    if (qualified_at) byTier[tier].qualified++;
  }

  // Step 5: bulk write.
  await bulkUpsertWallets(upserts);

  // Step 6: audit row.
  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - start;

  const pollRunId = await recordPollRun({
    startedAt,
    finishedAt,
    durationMs,
    totalSupply: totalSupply.toString(),
    decimals,
    accountsScanned,
    walletsTracked: upserts.filter((u) => u.current_tier !== null).length,
    eventsNew,
    eventsUpdated,
    eventsReset,
    ok: true,
  });

  return {
    pollRunId,
    startedAt: startedAt.toISOString(),
    durationMs,
    totalSupply: totalSupply.toString(),
    decimals,
    accountsScanned,
    walletsTracked: upserts.filter((u) => u.current_tier !== null).length,
    byTier,
    events: { new: eventsNew, updated: eventsUpdated, reset: eventsReset },
  };
}
