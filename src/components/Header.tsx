'use client';

import { useEffect, useState } from 'react';
import styles from './Header.module.scss';

const SOCIALS = [
  { label: 'X', href: 'https://x.com/TheWasabiCheese', title: 'X / Twitter' },
  { label: 'TG', href: 'https://t.me/WasabiCheesePortal', title: 'Telegram' },
  { label: 'WEB', href: 'https://wasabicheese.com/', title: 'Website' },
  { label: 'SOL', href: 'https://solscan.io/token/DSZeB6pCzZsM43gTz7jakiYeCafinsNMKcpeB1FApump', title: 'Solscan' },
  { label: 'PUMP', href: 'https://pump.fun/coin/DSZeB6pCzZsM43gTz7jakiYeCafinsNMKcpeB1FApump', title: 'Pump.fun' },
];

interface Market {
  priceUsd: number;
  marketCap: number;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  if (n > 0 && n < 0.01) return `$${n.toFixed(8)}`;
  return `$${n.toFixed(2)}`;
}

export function Header() {
  const [market, setMarket] = useState<Market | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch('/api/public/mcap')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => !cancelled && d && !d.error && setMarket(d))
        .catch(() => {});

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={`page ${styles.headerInner}`}>
        <a href="/" className={styles.brand}>
          <div className={styles.logo}>
            <img src="/mascot/logo.png" alt="Wasabi" />
          </div>
          <div className={styles.wordmark}>
            <span className={styles.name}>WASABI</span>
            <span className={styles.tag}>HODL Rewards</span>
          </div>
        </a>

        <div className={styles.market}>
          <div className={styles.marketStat}>
            <span className={styles.label}>Price</span>
            <span className={styles.value}>{market ? formatUsd(market.priceUsd) : '—'}</span>
          </div>
          <div className={styles.marketStat}>
            <span className={styles.label}>Mcap</span>
            <span className={styles.value}>{market ? formatUsd(market.marketCap) : '—'}</span>
          </div>
        </div>

        <div className={styles.socials}>
          {SOCIALS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noreferrer"
              title={s.title}
              className={styles.socialBtn}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
