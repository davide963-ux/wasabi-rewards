'use client';

import { useMemo } from 'react';
import styles from './LiveTicker.module.scss';
import type { Tier } from '@/lib/tiers';

interface QualifiedHolder {
  wallet: string;
  pctBps: number;
  pct: string;
  streakDays: number;
}

interface Props {
  tiers: Record<Tier, { qualifiedCount: number; leaderboard: QualifiedHolder[] }>;
  walletsTracked: number;
}

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 5)}…${addr.slice(-5)}`;
}

interface TickerItem {
  type: 'holder' | 'stat';
  tier?: Tier;
  text: string;
  wallet?: string;
}

export function LiveTicker({ tiers, walletsTracked }: Props) {
  const items = useMemo<TickerItem[]>(() => {
    const list: TickerItem[] = [];
    const tierOrder: Tier[] = ['PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];

    // Add top wallet from each tier
    for (const tier of tierOrder) {
      const top = tiers[tier]?.leaderboard?.[0];
      if (top) {
        list.push({
          type: 'holder',
          tier,
          wallet: top.wallet,
          text: `holds ${top.pct} for ${top.streakDays}d`,
        });
      }
    }

    // Add stat items
    list.push({ type: 'stat', text: `${walletsTracked} wallets being tracked` });
    const totalQualified = tierOrder.reduce((sum, t) => sum + (tiers[t]?.qualifiedCount ?? 0), 0);
    list.push({ type: 'stat', text: `${totalQualified} qualified across all tiers` });
    list.push({ type: 'stat', text: 'updates every 2 minutes' });
    list.push({ type: 'stat', text: 'stay spicy · don\'t sell' });

    // If we have very few items, repeat for nicer scrolling
    if (list.length < 6) {
      const original = [...list];
      while (list.length < 12) list.push(...original);
    }

    return list;
  }, [tiers, walletsTracked]);

  // Duplicate the items so the marquee loops seamlessly
  const display = [...items, ...items];

  return (
    <div className={styles.ticker} aria-label="Live activity">
      <span className={styles.label}>
        <span className={styles.pulse} />
        Live
      </span>
      <div className={styles.track}>
        {display.map((item, i) => (
          <span key={i} className={styles.item}>
            <span className={`${styles.dot} ${item.tier ? styles[item.tier] : styles.UPDATE}`} />
            {item.type === 'holder' ? (
              <>
                <span className={`${styles.tier} ${styles[item.tier!]}`}>{item.tier}</span>
                <span className={styles.wallet}>{shorten(item.wallet!)}</span>
                <span className={styles.dim}>{item.text}</span>
              </>
            ) : (
              <span className={styles.dim}>{item.text}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
