'use client';

import { useState } from 'react';
import styles from './Footer.module.scss';
import type { Tier } from '@/lib/tiers';

interface Winner {
  goalId: number;
  goalTargetUsd: number;
  goalLabel: string | null;
  goalReachedAt: string | null;
  tier: Tier;
  wallet: string;
  pctAtWin: string;
  streakDays: number;
  pickedAt: string;
}

const TIER_LABEL: Record<Tier, string> = {
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
};

function shorten(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function Winners({ winners }: { winners: Winner[] }) {
  if (winners.length === 0) return null;

  return (
    <section className={styles.winnersSection}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Faces <span className={styles.accent}>melted</span>
        </h2>
        <span className={styles.counter}>
          {winners.length} winner{winners.length === 1 ? '' : 's'}
        </span>
      </div>

      {winners.map((w) => (
        <div key={`${w.goalId}-${w.tier}`} className={styles.winnerCard}>
          <span className={`${styles.winnerTier} ${styles[w.tier]}`}>{TIER_LABEL[w.tier]}</span>
          <div>
            href={`https://solscan.io/account/${w.wallet}`}
              target="_blank"
              rel="noreferrer"
              className={styles.winnerWallet}
              title={w.wallet}
            >
              {shorten(w.wallet)} ↗
            </a>
            <div className={styles.winnerGoal}>
              {w.goalLabel ?? `${formatUsd(w.goalTargetUsd)} milestone`}
            </div>
          </div>
          <div className={styles.winnerMeta}>
            <div>{w.pctAtWin} held</div>
            <div>{w.streakDays}d streak</div>
            <div>{formatRelative(w.goalReachedAt)}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

const CONTRACT_ADDRESS = 'DSZeB6pCzZsM43gTz7jakiYeCafinsNMKcpeB1FApump';

export function Community() {
  const [copied, setCopied] = useState(false);

  function copyContract() {
    navigator.clipboard.writeText(CONTRACT_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className={styles.community}>
      <h2 className={styles.communityTitle}>
        Stay <span className={styles.accent}>spicy</span>.
      </h2>
      <p className={styles.communitySub}>The most dangerous community on Solana</p>

      <div className={styles.socialGrid}>
        <a
          className={styles.socialBlock}
          href="https://x.com/TheWasabiCheese"
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.platform}>X / Twitter</div>
          <div className={styles.desc}>Follow for updates</div>
          <span className={styles.arrow}>→</span>
        </a>
        <a
          className={styles.socialBlock}
          href="https://t.me/WasabiCheesePortal"
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.platform}>Telegram</div>
          <div className={styles.desc}>Join the chat</div>
          <span className={styles.arrow}>→</span>
        </a>
        <a
          className={styles.socialBlock}
          href="https://dexscreener.com/solana/5fc4vroj4n4dqtznt936y81eer3tyft2shn37qrmcq22"
          target="_blank"
          rel="noreferrer"
        >
          <div className={styles.platform}>DexScreener</div>
          <div className={styles.desc}>Watch the chart</div>
          <span className={styles.arrow}>→</span>
        </a>
      </div>

      <div className={styles.contractBox}>
        <span className={styles.label}>CA</span>
        <span className={styles.ca}>{CONTRACT_ADDRESS}</span>
        <button
          onClick={copyContract}
          className={`${styles.copy} ${copied ? styles.copied : ''}`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className={styles.smokingMascot} aria-hidden="true">
        <img src="/mascot/smoking.png" alt="" />
      </div>

      <p className={styles.disclaimer}>
        Not financial advice · Just spicy vibes · Stay winning
      </p>
    </section>
  );
}
