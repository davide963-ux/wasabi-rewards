'use client';

import styles from './HowItWorks.module.scss';

export function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <h2 className={styles.title}>
        How to <span className={styles.strike}>not get rugged</span> win
      </h2>
      <p className={styles.subtitle}>3 simple steps · no signup · no claim · just hold</p>

      <div className={styles.grid}>
        <article className={styles.step}>
          <span className={styles.stepIcon}>🧀</span>
          <span className={styles.stepNum}>01</span>
          <h3 className={styles.stepTitle}>Hold</h3>
          <p className={styles.stepText}>
            Buy at least <strong>0.35%</strong> of supply to enter Bronze. More %, hotter tier.
            <strong> Platinum starts at 1%.</strong>
          </p>
        </article>

        <article className={styles.step}>
          <span className={styles.stepIcon}>🌶️</span>
          <span className={styles.stepNum}>02</span>
          <h3 className={styles.stepTitle}>Stay spicy</h3>
          <p className={styles.stepText}>
            Don't sell below <strong>0.35%</strong> for <strong>7 days</strong> straight.
            Drop below the line and the timer resets — start over.
          </p>
        </article>

        <article className={styles.step}>
          <span className={styles.stepIcon}>💸</span>
          <span className={styles.stepNum}>03</span>
          <h3 className={styles.stepTitle}>Win</h3>
          <p className={styles.stepText}>
            When the next mcap goal melts, <strong>one winner per tier</strong> walks away
            with rewards. Picked from the qualified leaderboard.
          </p>
        </article>

        <div className={styles.buff} aria-hidden="true">
          <img src="/mascot/buff.png" alt="" />
        </div>
      </div>
    </section>
  );
}
