/**
 * Postgres database layer using Neon's serverless driver.
 *
 * Schema overview:
 *   - wallets:    one row per wallet that has ever held ≥ MIN_TIER_BPS.
 *                 Stores current balance, current tier range, streak start,
 *                 and qualification status. UPDATED in place by the poller.
 *   - poll_runs:  audit log of polling runs (when, how long, how many wallets).
 *   - goals:      mcap targets the admin defines.
 *   - winners:    one row per (goal, tier) — the winner the admin picked.
 *   - exclusions: custom wallet/owner addresses to exclude beyond the defaults.
 *   - settings:   simple key/value store for runtime config.
 *
 * The poller works by diffing: it fetches all current holders, then for each
 * wallet either UPDATES the existing row or INSERTs a new one. Wallets that
 * existed before but aren't in the new fetch have their balance set to 0,
 * which resets their streak.
 */

import { neon } from '@neondatabase/serverless';
import type { Tier } from './tiers';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add it in Vercel project settings.');
  }
  return neon(url);
}

let _schemaReady = false;

export async function ensureSchema(): Promise<void> {
  if (_schemaReady) return;
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS wallets (
      wallet           TEXT PRIMARY KEY,
      balance          TEXT NOT NULL,
      pct_bps          INTEGER NOT NULL,
      current_tier     TEXT,
      streak_start_at  TIMESTAMPTZ,
      qualified_at     TIMESTAMPTZ,
      first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_wallets_tier ON wallets(current_tier) WHERE current_tier IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS idx_wallets_qualified ON wallets(qualified_at) WHERE qualified_at IS NOT NULL`;

  await sql`
    CREATE TABLE IF NOT EXISTS poll_runs (
      id              SERIAL PRIMARY KEY,
      started_at      TIMESTAMPTZ NOT NULL,
      finished_at     TIMESTAMPTZ NOT NULL,
      duration_ms     INTEGER NOT NULL,
      total_supply    TEXT NOT NULL,
      decimals        INTEGER NOT NULL,
      accounts_scanned INTEGER NOT NULL DEFAULT 0,
      wallets_tracked INTEGER NOT NULL DEFAULT 0,
      events_new      INTEGER NOT NULL DEFAULT 0,
      events_updated  INTEGER NOT NULL DEFAULT 0,
      events_reset    INTEGER NOT NULL DEFAULT 0,
      ok              BOOLEAN NOT NULL DEFAULT TRUE,
      error           TEXT
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_poll_runs_started ON poll_runs(started_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS goals (
      id              SERIAL PRIMARY KEY,
      target_usd      NUMERIC(18,2) NOT NULL,
      label           TEXT,
      is_current      BOOLEAN NOT NULL DEFAULT FALSE,
      reached_at      TIMESTAMPTZ,
      reached_mcap    NUMERIC(18,2),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_one_current ON goals(is_current) WHERE is_current = TRUE`;

  await sql`
    CREATE TABLE IF NOT EXISTS winners (
      id              SERIAL PRIMARY KEY,
      goal_id         INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      tier            TEXT NOT NULL,
      wallet          TEXT NOT NULL,
      pct_bps_at_win  INTEGER NOT NULL,
      balance_at_win  TEXT NOT NULL,
      streak_days     INTEGER NOT NULL,
      picked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (goal_id, tier)
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_winners_goal ON winners(goal_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS exclusions (
      wallet     TEXT PRIMARY KEY,
      reason     TEXT,
      added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  _schemaReady = true;
}

// ============================================================================
// Wallet operations
// ============================================================================

export interface WalletRow {
  wallet: string;
  balance: string;
  pct_bps: number;
  current_tier: Tier | null;
  streak_start_at: string | null;
  qualified_at: string | null;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
}

/** Get all wallets currently above the minimum threshold. */
export async function getActiveWallets(): Promise<WalletRow[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`
    SELECT * FROM wallets WHERE current_tier IS NOT NULL ORDER BY pct_bps DESC
  `) as WalletRow[];
}

/** Get qualified wallets in a specific tier. */
export async function getQualifiedByTier(tier: Tier, limit = 1000): Promise<WalletRow[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`
    SELECT * FROM wallets
    WHERE current_tier = ${tier} AND qualified_at IS NOT NULL
    ORDER BY pct_bps DESC
    LIMIT ${limit}
  `) as WalletRow[];
}

/** Get all wallets in a tier (qualified + pending). */
export async function getAllByTier(tier: Tier, limit = 1000): Promise<WalletRow[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`
    SELECT * FROM wallets WHERE current_tier = ${tier}
    ORDER BY pct_bps DESC LIMIT ${limit}
  `) as WalletRow[];
}

export async function getWalletByAddress(wallet: string): Promise<WalletRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM wallets WHERE wallet = ${wallet}`) as WalletRow[];
  return rows[0] ?? null;
}

/** Get all currently-known wallet addresses (for the poller's diff). */
export async function getAllTrackedWallets(): Promise<Map<string, WalletRow>> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM wallets`) as WalletRow[];
  const map = new Map<string, WalletRow>();
  for (const r of rows) map.set(r.wallet, r);
  return map;
}

/**
 * Apply a batch of computed wallet states. The poller produces an upsert row
 * per wallet describing what its new state should be; we fan that out into one
 * UPSERT statement chunk.
 */
export interface WalletUpsert {
  wallet: string;
  balance: string;
  pct_bps: number;
  current_tier: Tier | null;
  streak_start_at: string | null;
  qualified_at: string | null;
}

export async function bulkUpsertWallets(rows: WalletUpsert[]): Promise<void> {
  if (rows.length === 0) return;
  const sql = getSql();
  const CHUNK = 2000;

  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const wallets = batch.map((r) => r.wallet);
    const balances = batch.map((r) => r.balance);
    const pcts = batch.map((r) => r.pct_bps);
    const tiers = batch.map((r) => r.current_tier);
    const streaks = batch.map((r) => r.streak_start_at);
    const quals = batch.map((r) => r.qualified_at);

    await sql`
      INSERT INTO wallets (
        wallet, balance, pct_bps, current_tier, streak_start_at, qualified_at,
        first_seen_at, last_seen_at, updated_at
      )
      SELECT w, b, p, t, s::timestamptz, q::timestamptz, NOW(), NOW(), NOW()
      FROM unnest(
        ${wallets}::text[],
        ${balances}::text[],
        ${pcts}::int[],
        ${tiers}::text[],
        ${streaks}::text[],
        ${quals}::text[]
      ) AS u(w, b, p, t, s, q)
      ON CONFLICT (wallet) DO UPDATE SET
        balance         = EXCLUDED.balance,
        pct_bps         = EXCLUDED.pct_bps,
        current_tier    = EXCLUDED.current_tier,
        streak_start_at = EXCLUDED.streak_start_at,
        qualified_at    = EXCLUDED.qualified_at,
        last_seen_at    = NOW(),
        updated_at      = NOW()
    `;
  }
}

// ============================================================================
// Poll run audit log
// ============================================================================

export interface PollRunInput {
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  totalSupply: string;
  decimals: number;
  accountsScanned: number;
  walletsTracked: number;
  eventsNew: number;
  eventsUpdated: number;
  eventsReset: number;
  ok: boolean;
  error?: string;
}

export async function recordPollRun(run: PollRunInput): Promise<number> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO poll_runs (
      started_at, finished_at, duration_ms, total_supply, decimals,
      accounts_scanned, wallets_tracked, events_new, events_updated, events_reset,
      ok, error
    ) VALUES (
      ${run.startedAt.toISOString()}, ${run.finishedAt.toISOString()}, ${run.durationMs},
      ${run.totalSupply}, ${run.decimals},
      ${run.accountsScanned}, ${run.walletsTracked},
      ${run.eventsNew}, ${run.eventsUpdated}, ${run.eventsReset},
      ${run.ok}, ${run.error ?? null}
    ) RETURNING id
  `) as { id: number }[];
  return rows[0].id;
}

export async function getLatestPollRun(): Promise<{
  finished_at: string;
  duration_ms: number;
  wallets_tracked: number;
  total_supply: string;
  decimals: number;
  ok: boolean;
} | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT finished_at, duration_ms, wallets_tracked, total_supply, decimals, ok
    FROM poll_runs
    WHERE ok = TRUE
    ORDER BY finished_at DESC
    LIMIT 1
  `) as {
    finished_at: string;
    duration_ms: number;
    wallets_tracked: number;
    total_supply: string;
    decimals: number;
    ok: boolean;
  }[];
  return rows[0] ?? null;
}

// ============================================================================
// Goals
// ============================================================================

export interface GoalRow {
  id: number;
  target_usd: string;
  label: string | null;
  is_current: boolean;
  reached_at: string | null;
  reached_mcap: string | null;
  created_at: string;
}

export async function listGoals(): Promise<GoalRow[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`SELECT * FROM goals ORDER BY target_usd ASC`) as GoalRow[];
}

export async function getCurrentGoal(): Promise<GoalRow | null> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT * FROM goals WHERE is_current = TRUE LIMIT 1`) as GoalRow[];
  return rows[0] ?? null;
}

export async function createGoal(targetUsd: number, label: string | null): Promise<GoalRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO goals (target_usd, label) VALUES (${targetUsd}, ${label})
    RETURNING *
  `) as GoalRow[];
  return rows[0];
}

export async function setCurrentGoal(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  // Wrapped in a single statement so it's atomic
  await sql`UPDATE goals SET is_current = (id = ${id})`;
}

export async function markGoalReached(id: number, reachedMcap: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    UPDATE goals
    SET reached_at = NOW(), reached_mcap = ${reachedMcap}, is_current = FALSE
    WHERE id = ${id}
  `;
}

export async function deleteGoal(id: number): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM goals WHERE id = ${id}`;
}

// ============================================================================
// Winners
// ============================================================================

export interface WinnerRow {
  id: number;
  goal_id: number;
  tier: Tier;
  wallet: string;
  pct_bps_at_win: number;
  balance_at_win: string;
  streak_days: number;
  picked_at: string;
}

export async function listWinnersByGoal(goalId: number): Promise<WinnerRow[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`SELECT * FROM winners WHERE goal_id = ${goalId}`) as WinnerRow[];
}

export async function listAllWinners(): Promise<(WinnerRow & { goal: GoalRow })[]> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    SELECT
      w.*,
      g.id AS g_id, g.target_usd AS g_target, g.label AS g_label,
      g.is_current AS g_is_current, g.reached_at AS g_reached_at,
      g.reached_mcap AS g_reached_mcap, g.created_at AS g_created_at
    FROM winners w
    JOIN goals g ON g.id = w.goal_id
    ORDER BY w.picked_at DESC
  `) as Array<
    WinnerRow & {
      g_id: number;
      g_target: string;
      g_label: string | null;
      g_is_current: boolean;
      g_reached_at: string | null;
      g_reached_mcap: string | null;
      g_created_at: string;
    }
  >;

  return rows.map((r) => ({
    id: r.id,
    goal_id: r.goal_id,
    tier: r.tier,
    wallet: r.wallet,
    pct_bps_at_win: r.pct_bps_at_win,
    balance_at_win: r.balance_at_win,
    streak_days: r.streak_days,
    picked_at: r.picked_at,
    goal: {
      id: r.g_id,
      target_usd: r.g_target,
      label: r.g_label,
      is_current: r.g_is_current,
      reached_at: r.g_reached_at,
      reached_mcap: r.g_reached_mcap,
      created_at: r.g_created_at,
    },
  }));
}

export async function pickWinner(args: {
  goalId: number;
  tier: Tier;
  wallet: string;
  pctBps: number;
  balance: string;
  streakDays: number;
}): Promise<WinnerRow> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO winners (goal_id, tier, wallet, pct_bps_at_win, balance_at_win, streak_days)
    VALUES (${args.goalId}, ${args.tier}, ${args.wallet}, ${args.pctBps}, ${args.balance}, ${args.streakDays})
    ON CONFLICT (goal_id, tier) DO UPDATE SET
      wallet         = EXCLUDED.wallet,
      pct_bps_at_win = EXCLUDED.pct_bps_at_win,
      balance_at_win = EXCLUDED.balance_at_win,
      streak_days    = EXCLUDED.streak_days,
      picked_at      = NOW()
    RETURNING *
  `) as WinnerRow[];
  return rows[0];
}

// ============================================================================
// Exclusions
// ============================================================================

export async function getExtraExclusions(): Promise<Set<string>> {
  await ensureSchema();
  const sql = getSql();
  const rows = (await sql`SELECT wallet FROM exclusions`) as { wallet: string }[];
  return new Set(rows.map((r) => r.wallet));
}

export async function listExclusions(): Promise<{ wallet: string; reason: string | null; added_at: string }[]> {
  await ensureSchema();
  const sql = getSql();
  return (await sql`SELECT wallet, reason, added_at FROM exclusions ORDER BY added_at DESC`) as {
    wallet: string;
    reason: string | null;
    added_at: string;
  }[];
}

export async function addExclusion(wallet: string, reason: string | null): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`
    INSERT INTO exclusions (wallet, reason) VALUES (${wallet}, ${reason})
    ON CONFLICT (wallet) DO UPDATE SET reason = EXCLUDED.reason
  `;
}

export async function removeExclusion(wallet: string): Promise<void> {
  await ensureSchema();
  const sql = getSql();
  await sql`DELETE FROM exclusions WHERE wallet = ${wallet}`;
  // Also force the wallet's row to be re-evaluated on the next poll
  await sql`UPDATE wallets SET updated_at = NOW() WHERE wallet = ${wallet}`;
}
