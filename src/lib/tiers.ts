/**
 * Tier classification logic.
 *
 * Percentages are stored as basis points (bps) to avoid floats:
 *   1.00% = 100 bps
 *   0.70% = 70 bps
 *   0.50% = 50 bps
 *   0.35% = 35 bps
 *
 * A wallet's "current tier range" is purely a function of its current %.
 * It does NOT consider duration — that's tracked separately as a streak.
 *
 * A wallet is "qualified" for its current tier range only if BOTH:
 *   - Their current % is in that range
 *   - Their continuous streak above 0.35% has lasted ≥ DURATION_DAYS
 */

export type Tier = 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE';

export const TIER_THRESHOLDS_BPS: Record<Tier, number> = {
  PLATINUM: 100, // ≥ 1.00%
  GOLD: 70, //     0.70% – 0.99%
  SILVER: 50, //   0.50% – 0.69%
  BRONZE: 35, //   0.35% – 0.49%
};

export const TIER_ORDER: Tier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];
export const MIN_TIER_BPS = TIER_THRESHOLDS_BPS.BRONZE; // 35 bps = 0.35%

/** Duration a wallet must remain continuously ≥ MIN_TIER_BPS to qualify. */
export const DURATION_DAYS = 7;
export const DURATION_MS = DURATION_DAYS * 24 * 60 * 60 * 1000;

/**
 * Classify by current %. Returns null if below the minimum (0.35%).
 * NOTE: classification by % alone — duration is NOT considered here.
 */
export function classifyTier(pctBps: number): Tier | null {
  if (pctBps >= TIER_THRESHOLDS_BPS.PLATINUM) return 'PLATINUM';
  if (pctBps >= TIER_THRESHOLDS_BPS.GOLD) return 'GOLD';
  if (pctBps >= TIER_THRESHOLDS_BPS.SILVER) return 'SILVER';
  if (pctBps >= TIER_THRESHOLDS_BPS.BRONZE) return 'BRONZE';
  return null;
}

/**
 * Compute % of supply in basis points using BigInt arithmetic.
 *   pctBps = (balance * 10_000) / totalSupply
 */
export function computePctBps(balance: bigint, totalSupply: bigint): number {
  if (totalSupply === 0n) return 0;
  return Number((balance * 10_000n) / totalSupply);
}

/** Format basis points as percentage string. 100 bps → "1.00%" */
export function formatPct(pctBps: number): string {
  return (pctBps / 100).toFixed(2) + '%';
}

export const TIER_LABEL: Record<Tier, string> = {
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
};

export const TIER_RANGE_LABEL: Record<Tier, string> = {
  PLATINUM: '≥ 1.00%',
  GOLD: '0.70 – 0.99%',
  SILVER: '0.50 – 0.69%',
  BRONZE: '0.35 – 0.49%',
};
