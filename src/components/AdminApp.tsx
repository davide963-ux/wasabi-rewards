'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TIER_ORDER, type Tier, TIER_RANGE_LABEL } from '@/lib/tiers';
import s from '@/styles/admin.module.scss';

type Tab = 'goals' | 'winners' | 'exclusions';

interface GoalRow {
  id: number;
  target_usd: string;
  label: string | null;
  is_current: boolean;
  reached_at: string | null;
  reached_mcap: string | null;
}

interface QualifiedRow {
  wallet: string;
  balance: string;
  pctBps: number;
  pct: string;
  streakDays: number;
  qualified: boolean;
}

interface WinnerRow {
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

interface ExclusionRow {
  wallet: string;
  reason: string | null;
  added_at: string;
}

const TIER_LABEL: Record<Tier, string> = {
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze',
};

const TIER_FLAMES: Record<Tier, string> = {
  PLATINUM: '🔥🔥🔥🔥',
  GOLD: '🔥🔥🔥',
  SILVER: '🔥🔥',
  BRONZE: '🔥',
};

function shorten(addr: string) {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function AdminApp() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('goals');

  async function logout() {
    await fetch('/api/admin/login', { method: 'DELETE' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <main className={s.shell}>
      <header className={s.topbar}>
        <div className={s.brand}>
          <div className={s.logo}>
            <img src="/mascot/logo.png" alt="" />
          </div>
          Wasabi Admin
        </div>
        <button className={`${s.btn} ${s.secondary}`} onClick={logout} style={{ height: 36 }}>
          Sign out
        </button>
      </header>

      <div className={s.tabBar}>
        <button
          className={`${s.tab} ${tab === 'goals' ? s.active : ''}`}
          onClick={() => setTab('goals')}
        >
          Goals
        </button>
        <button
          className={`${s.tab} ${tab === 'winners' ? s.active : ''}`}
          onClick={() => setTab('winners')}
        >
          Pick winners
        </button>
        <button
          className={`${s.tab} ${tab === 'exclusions' ? s.active : ''}`}
          onClick={() => setTab('exclusions')}
        >
          Exclusions
        </button>
      </div>

      {tab === 'goals' && <GoalsTab />}
      {tab === 'winners' && <WinnersTab />}
      {tab === 'exclusions' && <ExclusionsTab />}
    </main>
  );
}

// ============================================================================
// Goals
// ============================================================================

function GoalsTab() {
  const [goals, setGoals] = useState<GoalRow[] | null>(null);
  const [target, setTarget] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch('/api/admin/goals');
    if (res.ok) {
      const body = await res.json();
      setGoals(body.goals);
    }
  }

  useEffect(() => { load(); }, []);

  async function createGoal(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const targetUsd = parseFloat(target);
      if (!isFinite(targetUsd) || targetUsd <= 0) throw new Error('Enter a positive number');
      const res = await fetch('/api/admin/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsd, label: label || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'failed to create goal');
      }
      setTarget('');
      setLabel('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function setCurrent(id: number) {
    await fetch(`/api/admin/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setCurrent: true }),
    });
    await load();
  }

  async function markReached(id: number) {
    if (!confirm('Mark this goal as reached? The current market cap will be recorded.')) return;
    await fetch(`/api/admin/goals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markReached: true }),
    });
    await load();
  }

  async function deleteGoal(id: number) {
    if (!confirm('Delete this goal? This will also delete any winners recorded against it.')) return;
    await fetch(`/api/admin/goals/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <>
      <section className={s.card}>
        <h3>Add a new goal</h3>
        {error && <div className={s.error}>{error}</div>}
        <form className={s.form} onSubmit={createGoal}>
          <label className={s.label}>
            Target USD
            <input
              type="number"
              className={s.input}
              placeholder="1000000"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              min="0"
              step="any"
              required
            />
          </label>
          <label className={s.label}>
            Label (optional)
            <input
              type="text"
              className={s.input}
              placeholder="$1M Milestone"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button type="submit" className={s.btn} disabled={busy}>
            {busy ? 'Adding…' : 'Add goal'}
          </button>
        </form>
      </section>

      <section className={s.card}>
        <h3>All goals</h3>
        {!goals && <p className={s.empty}>Loading…</p>}
        {goals && goals.length === 0 && <p className={s.empty}>No goals yet.</p>}
        {goals && goals.length > 0 && (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Target</th>
                <th>Label</th>
                <th>Status</th>
                <th>Reached at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id}>
                  <td>{formatUsd(parseFloat(g.target_usd))}</td>
                  <td>{g.label ?? '—'}</td>
                  <td>
                    {g.reached_at ? (
                      <span className={s.qualified}>Reached</span>
                    ) : g.is_current ? (
                      <span className={s.current}>Current</span>
                    ) : (
                      <span className={s.pending}>Pending</span>
                    )}
                  </td>
                  <td>{g.reached_at ? new Date(g.reached_at).toLocaleString() : '—'}</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!g.reached_at && !g.is_current && (
                      <button className={`${s.btn} ${s.secondary}`} onClick={() => setCurrent(g.id)}>
                        Set current
                      </button>
                    )}
                    {!g.reached_at && (
                      <button className={`${s.btn} ${s.secondary}`} onClick={() => markReached(g.id)}>
                        Mark reached
                      </button>
                    )}
                    <button className={`${s.btn} ${s.danger}`} onClick={() => deleteGoal(g.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

// ============================================================================
// Winners
// ============================================================================

function WinnersTab() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [qualified, setQualified] = useState<Record<Tier, QualifiedRow[]> | null>(null);
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAll() {
    const [g, q, w] = await Promise.all([
      fetch('/api/admin/goals').then((r) => r.json()),
      fetch('/api/admin/qualified').then((r) => r.json()),
      fetch('/api/public/state').then((r) => r.json()),
    ]);
    setGoals(g.goals);
    setQualified(q.tiers);
    setWinners(w.winners);
    if (selectedGoalId == null) {
      const candidate = (g.goals as GoalRow[]).find((x) => x.is_current) ?? g.goals[0];
      if (candidate) setSelectedGoalId(candidate.id);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function winnersForGoal(goalId: number, allWinners: WinnerRow[]): WinnerRow[] {
    return allWinners.filter((w) => w.goalId === goalId);
  }

  async function pickWinner(tier: Tier, wallet: string) {
    if (selectedGoalId == null) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: selectedGoalId, tier, wallet }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'failed to pick winner');
      }
      setSuccess(`Recorded winner for ${TIER_LABEL[tier]}: ${shorten(wallet)}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const goalWinners = selectedGoalId != null ? winnersForGoal(selectedGoalId, winners) : [];
  const wonTiers = new Set(goalWinners.map((w) => w.tier));

  return (
    <>
      <section className={s.card}>
        <h3>Select goal</h3>
        {goals.length === 0 ? (
          <p className={s.empty}>Add a goal first in the Goals tab.</p>
        ) : (
          <select
            className={s.input}
            value={selectedGoalId ?? ''}
            onChange={(e) => setSelectedGoalId(Number(e.target.value))}
            style={{ minWidth: 300 }}
          >
            <option value="">— pick a goal —</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {formatUsd(parseFloat(g.target_usd))}
                {g.label ? ` — ${g.label}` : ''}
                {g.reached_at ? ' (reached)' : g.is_current ? ' (current)' : ''}
              </option>
            ))}
          </select>
        )}

        {selectedGoalId != null && goalWinners.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p className={s.muted} style={{ marginBottom: 8 }}>Already picked</p>
            {goalWinners.map((w) => (
              <div key={w.tier} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, padding: '4px 0' }}>
                <strong>{TIER_LABEL[w.tier]}:</strong> {w.wallet} · {w.pctAtWin}
              </div>
            ))}
          </div>
        )}
      </section>

      {error && <div className={s.error}>{error}</div>}
      {success && <div className={s.success}>{success}</div>}

      {selectedGoalId != null &&
        TIER_ORDER.map((tier) => {
          const rows = qualified?.[tier] ?? [];
          const qualifiedRows = rows.filter((r) => r.qualified);
          const alreadyWon = wonTiers.has(tier);
          return (
            <section key={tier} className={s.tierSection}>
              <header className={s.tierSectionHead}>
                <div className={s.tierSectionName}>
                  <span style={{ fontSize: 16 }}>{TIER_FLAMES[tier]}</span>
                  {TIER_LABEL[tier]}
                  <span className={s.muted}>
                    {TIER_RANGE_LABEL[tier]} · {qualifiedRows.length} qualified · {rows.length - qualifiedRows.length} pending
                  </span>
                </div>
                {alreadyWon && <span className={s.qualified}>winner picked</span>}
              </header>

              {qualifiedRows.length === 0 ? (
                <p className={s.empty}>No fully-qualified holders yet.</p>
              ) : (
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>Wallet</th>
                      <th>%</th>
                      <th>Streak</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualifiedRows.slice(0, 50).map((r) => (
                      <tr key={r.wallet}>
                        <td title={r.wallet}>{r.wallet}</td>
                        <td>{r.pct}</td>
                        <td>{r.streakDays}d</td>
                        <td>
                          <button
                            className={s.btn}
                            disabled={alreadyWon}
                            onClick={() => pickWinner(tier, r.wallet)}
                          >
                            {alreadyWon ? 'Picked' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          );
        })}
    </>
  );
}

// ============================================================================
// Exclusions
// ============================================================================

function ExclusionsTab() {
  const [exclusions, setExclusions] = useState<ExclusionRow[]>([]);
  const [wallet, setWallet] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch('/api/admin/exclusions');
    if (res.ok) {
      const body = await res.json();
      setExclusions(body.exclusions);
    }
  }

  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/admin/exclusions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: wallet.trim(), reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'failed');
      }
      setWallet('');
      setReason('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function remove(w: string) {
    if (!confirm(`Remove exclusion for ${w}?`)) return;
    await fetch(`/api/admin/exclusions/${w}`, { method: 'DELETE' });
    await load();
  }

  return (
    <>
      <section className={s.card}>
        <h3>Add exclusion</h3>
        <p className={s.muted} style={{ marginBottom: 16, lineHeight: 1.6 }}>
          AMM/DEX wallets are auto-excluded. Use this for custom ones (team wallets, market makers).
        </p>
        {error && <div className={s.error}>{error}</div>}
        <form className={s.form} onSubmit={add}>
          <label className={s.label}>
            Wallet address
            <input
              type="text"
              className={s.input}
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              style={{ minWidth: 380 }}
              required
            />
          </label>
          <label className={s.label}>
            Reason (optional)
            <input
              type="text"
              className={s.input}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Team wallet"
            />
          </label>
          <button type="submit" className={s.btn}>Add</button>
        </form>
      </section>

      <section className={s.card}>
        <h3>Custom exclusions</h3>
        {exclusions.length === 0 ? (
          <p className={s.empty}>No custom exclusions. AMM defaults still apply.</p>
        ) : (
          <table className={s.table}>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Reason</th>
                <th>Added</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {exclusions.map((e) => (
                <tr key={e.wallet}>
                  <td>{e.wallet}</td>
                  <td>{e.reason ?? '—'}</td>
                  <td className={s.muted}>{new Date(e.added_at).toLocaleDateString()}</td>
                  <td>
                    <button className={`${s.btn} ${s.danger}`} onClick={() => remove(e.wallet)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
