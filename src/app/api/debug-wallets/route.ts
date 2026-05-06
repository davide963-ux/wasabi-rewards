import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  
  const all = await sql`SELECT current_tier, qualified_at, pct_bps FROM wallets WHERE current_tier IS NOT NULL ORDER BY pct_bps DESC LIMIT 5`;
  
  const platinumNotNull = await sql`SELECT COUNT(*) as count FROM wallets WHERE current_tier = 'PLATINUM' AND qualified_at IS NOT NULL`;
  const platinumNullCheck = await sql`SELECT COUNT(*) as count FROM wallets WHERE current_tier = 'PLATINUM' AND qualified_at::text != 'null'`;
  const platinumAll = await sql`SELECT COUNT(*) as count FROM wallets WHERE current_tier = 'PLATINUM'`;
  
  return NextResponse.json({
    sample_rows: all,
    platinum_total: platinumAll,
    platinum_qualified_is_not_null: platinumNotNull,
    platinum_qualified_text_not_null: platinumNullCheck,
  });
}
