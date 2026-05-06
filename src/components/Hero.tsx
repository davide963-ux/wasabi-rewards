'use client';

import styles from './Hero.module.scss';

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`page ${styles.heroGrid}`}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>
            <span className={styles.pulse} />
            <span>Live · updates every 2 min</span>
          </div>

          <h1 className={styles.headline}>
            <span className={styles.line}>Bigger bags.</span>
            <span className={styles.line}>
              <span className={styles.hot}>Hotter</span>{' '}
              <span className={styles.accent}>rewards.</span>
            </span>
          </h1>

          <p className={styles.lede}>
            Top holders win every milestone. Stay above your tier for{' '}
            <strong>7 days continuous</strong> to qualify.{' '}
            <em>One winner per tier</em>, picked when the next mcap goal melts.
          </p>

          <div className={styles.actions}>
            <a
              href="#how-it-works"
              className={`${styles.cta} ${styles.primary}`}
            >
              How it works →
            </a>
            <a
              href="https://dexscreener.com/solana/5fc4vroj4n4dqtznt936y81eer3tyft2shn37qrmcq22"
              target="_blank"
              rel="noreferrer"
              className={`${styles.cta} ${styles.secondary}`}
            >
              Buy $WASABI
            </a>
          </div>
        </div>

        <div className={styles.mascotWrap}>
          <div className={styles.mascotGlow} />
          <div className={styles.mascot}>
            <img src="/mascot/sunglasses.png" alt="Wasabi mascot wearing sunglasses" />
          </div>
          <span className={styles.spice}>🔥</span>
          <span className={styles.spice}>🌶️</span>
          <span className={styles.spice}>🧀</span>
          <span className={styles.spice}>💸</span>
        </div>
      </div>
    </section>
  );
}
