'use client';

import styles from './SpicyOMeter.module.scss';

interface Props {
  current: number;
  target: number;
  label?: string | null;
  reached?: boolean;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

const ZONES = [
  { key: 'mild',    label: 'Mild',    flame: '🔥', threshold: 25 },
  { key: 'medium',  label: 'Medium',  flame: '🔥🔥', threshold: 50 },
  { key: 'spicy',   label: 'Spicy',   flame: '🔥🔥🔥', threshold: 75 },
  { key: 'nuclear', label: 'Nuclear', flame: '🔥🔥🔥🔥', threshold: 100 },
];

function activeZone(pct: number): string {
  if (pct >= 100) return 'nuclear';
  if (pct >= 75) return 'spicy';
  if (pct >= 50) return 'medium';
  if (pct >= 25) return 'mild';
  return '';
}

export function SpicyOMeter({ current, target, label, reached }: Props) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const active = activeZone(pct);

  // Position the mascot rider — clamp so it stays inside the gauge
  const riderLeft = `${Math.min(96, Math.max(4, pct))}%`;

  return (
    <section className={styles.section}>
      <div className={styles.meter}>
        <header className={styles.head}>
          <h2 className={styles.title}>
            <span className={styles.small}>Spicy-O-Meter</span>
            Next milestone: <span className={styles.accent}>{label ?? formatUsd(target)}</span>
          </h2>
          <div className={styles.stats}>
            <span className={styles.current}>{formatUsd(current)}</span>
            <span className={styles.of}> / {formatUsd(target)}</span>
            <span className={styles.pct}>{pct.toFixed(1)}%</span>
            <span className={styles.label}>
              {reached ? 'Goal reached · winners pending' : 'Climbing the heat'}
            </span>
          </div>
        </header>

        <div className={styles.gauge} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className={styles.gaugeFill} style={{ width: `${pct}%` }} />
          <div className={styles.rider} style={{ left: riderLeft }}>
            <img src="/mascot/sunglasses.png" alt="" />
          </div>
        </div>

        <div className={styles.zones}>
          {ZONES.map((z) => (
            <div
              key={z.key}
              className={`${styles.zone} ${styles[z.key] ?? ''} ${active === z.key ? styles.active : ''}`}
            >
              <span className={styles.flame}>{z.flame}</span>
              {z.label}
            </div>
          ))}
        </div>

        <p className={styles.message}>
          {reached
            ? <>🚨 Goal reached. <strong>Winners about to be picked.</strong> 🚨</>
            : pct >= 75
              ? <>The chart is <strong>melting faces</strong>. Hold tight.</>
              : pct >= 50
                ? <>Heating up. <strong>Stay spicy.</strong></>
                : pct >= 25
                  ? <>We're cooking. <strong>Don't sell.</strong></>
                  : <>Just getting started. <strong>WAGMI.</strong></>}
        </p>
      </div>
    </section>
  );
}

export function SpicyOMeterEmpty() {
  return (
    <section className={styles.section}>
      <div className={styles.meter}>
        <p className={styles.empty}>No active milestone. Admin will set one shortly.</p>
      </div>
    </section>
  );
}
