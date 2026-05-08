'use client';

import styles from './Leaderboard.module.scss';
import { TIER_ORDER, type Tier } from '@/lib/tiers';

interface Holder {
  wallet: string;
  balance: string;
  pctBps: number;
  pct: string;
  streakDays: number;
}

interface Props {
  tiers: Record<Tier, { qualifiedCount: number; leaderboard: Holder[] }>;
  decimals: number;
}

const TIER_DATA: Record<Tier, { name: string; flames: string }> = {
  PLATINUM: { name: 'Platinum Chef', flames: '🔥🔥' },
  GOLD:     { name: 'Gold Chef',     flames: '🔥' },
  SILVER:   { name: 'Silver Chef',   flames: '' },
  BRONZE:   { name: 'Bronze Chef',   flames: '' },
};

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatBalance(rawBalance: string, decimals: number): string {
  const big = BigInt(rawBalance);
  const divisor = 10n ** BigInt(decimals);
  const whole = big / divisor;
  return whole.toLocaleString('en-US');
}

function streakHeat(days: number): string {
  if (days >= 30) return '🔥🔥🔥';
  if (days >= 14) return '🔥🔥';
  return '🔥';
}

export function Leaderboard({ tiers, decimals }: Props) {
  return (
    <section className={styles.section} id="leaderboard">
      <div className={styles.head}>
        <h2 className={styles.title}>
          Live <span className={styles.accent}>leaderboard</span>
        </h2>
        <span className={styles.meta}>Top 25 per tier · qualified only</span>
      </div>

      <div className={styles.list}>
        {TIER_ORDER.map((tier) => {
          const data = TIER_DATA[tier];
          const t = tiers[tier];
          const holders = t?.leaderboard ?? [];
          return (
            <section key={tier} className={`${styles.tier} ${styles[tier]}`}>
              <header className={styles.tierHead}>
                <div className={styles.tierLabel}>
                  <span className={styles.tierFlames}>{data.flames}</span>
                  {data.name}
                </div>
                <div className={styles.tierMeta}>
                  <span className={styles.count}>{(t?.qualifiedCount ?? 0).toLocaleString()} qualified</span>
                </div>
              </header>

              {holders.length === 0 ? (
                <p className={styles.empty}>No qualified holders here yet — could be you in 7 days.</p>
              ) : (
                <ol className={styles.rows}>
                  {holders.map((h, i) => (
                    <li key={h.wallet} className={styles.row}>
                      <span className={styles.rank}>{(i + 1).toString().padStart(2, '0')}</span>
                     <a href={`https://solscan.io/account/${h.wallet}`}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.wallet}
                        title={h.wallet}
                      >
                        {shorten(h.wallet)} ↗
                      </a>
                      <span className={styles.pct}>{h.pct}</span>
                      <span className={styles.streak}>
                        <span className={styles.heat}>{streakHeat(h.streakDays)}</span>
                        {h.streakDays}d
                      </span>
                      <span className={styles.balance}>
                        {formatBalance(h.balance, decimals)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
