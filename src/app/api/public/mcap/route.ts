/**
 * GET /api/public/mcap
 *
 * Proxy to DexScreener's pair endpoint. The frontend hits this rather than
 * DexScreener directly so we (a) avoid CORS surprises and (b) can swap data
 * sources later without changing the UI.
 */

import { NextResponse } from 'next/server';
import { fetchMarketSnapshot } from '@/lib/dexscreener';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Cache server-side for 30s so repeat hits don't hammer DexScreener
export const revalidate = 30;

export async function GET() {
  const pair = process.env.DEXSCREENER_PAIR;
  if (!pair) {
    return NextResponse.json(
      { error: 'DEXSCREENER_PAIR is not configured' },
      { status: 500 }
    );
  }

  try {
    const snapshot = await fetchMarketSnapshot(pair);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
