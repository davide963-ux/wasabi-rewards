import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);

  // Show all wallets currently in GOLD with their qualified_at
  const goldRows = await sql`
    SELECT wallet, pct_bps, current_tier, streak_start_at, qualified_at, last_seen_at
    FROM wallets
    WHERE current_tier = 'GOLD'
    ORDER BY pct_bps DESC
  `;

  // And all 'qualified' GOLD via the same query the public endpoint uses
  const goldQualified = await sql`
    SELECT wallet, pct_bps, current_tier, qualified_at
    FROM wallets
    WHERE current_tier = 'GOLD' AND qualified_at IS NOT NULL
    ORDER BY pct_bps DESC
  `;

  // Mismatch finder: rows where current_tier says one thing but their pct_bps doesn't match
  const mismatches = await sql`
    SELECT wallet, pct_bps, current_tier
    FROM wallets
    WHERE current_tier IS NOT NULL
    AND (
      (current_tier = 'PLATINUM' AND pct_bps < 100)
      OR (current_tier = 'GOLD'   AND (pct_bps < 70 OR pct_bps >= 100))
      OR (current_tier = 'SILVER' AND (pct_bps < 50 OR pct_bps >= 70))
      OR (current_tier = 'BRONZE' AND (pct_bps < 35 OR pct_bps >= 50))
    )
  `;

  return NextResponse.json({
    gold_total_in_table: goldRows.length,
    gold_qualified_via_public_query: goldQualified.length,
    gold_rows: goldRows,
    mismatches_tier_vs_pct: mismatches,
  });
}
