'use client';

import styles from './TierCards.module.scss';
import { TIER_ORDER, type Tier } from '@/lib/tiers';

const TIER_DATA: Record<Tier, { name: string; flames: string; heat: string; range: string }> = {
  PLATINUM: { name: 'Platinum', flames: '🔥🔥🔥🔥', heat: 'Nuclear',  range: '≥ 1.00%' },
  GOLD:     { name: 'Gold',     flames: '🔥🔥🔥',   heat: 'Spicy',    range: '0.70 – 0.99%' },
  SILVER:   { name: 'Silver',   flames: '🔥🔥',     heat: 'Medium',   range: '0.50 – 0.69%' },
  BRONZE:   { name: 'Bronze',   flames: '🔥',       heat: 'Mild',     range: '0.35 – 0.49%' },
};

interface Props {
  tiers: Record<Tier, { qualifiedCount: number }>;
  walletsTracked: number;
  lastUpdated: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours}h ago`;
}

export function TierCards({ tiers, walletsTracked, lastUpdated }: Props) {
  return (
    <section className={styles.section} id="tiers">
      <div className={styles.head}>
        <h2 className={styles.title}>
          The <span className={styles.accent}>tiers</span>
        </h2>
        <div className={styles.meta}>
          Updated {formatRelative(lastUpdated)} · {walletsTracked.toLocaleString()} tracked
        </div>
      </div>

      <div className={styles.grid}>
        {TIER_ORDER.map((tier) => {
          const data = TIER_DATA[tier];
          const count = tiers[tier]?.qualifiedCount ?? 0;
          return (
            <article key={tier} className={`${styles.card} ${styles[tier]}`}>
              <div className={styles.flames}>{data.flames}</div>
              <h3 className={styles.tierName}>{data.name}</h3>
              <div className={styles.heat}>{data.heat} · 7d hold</div>
              <div className={styles.count}>{count.toLocaleString()}</div>
              <div className={styles.countLabel}>qualified</div>
              <div className={styles.range}>
                Hold <strong>{data.range}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
