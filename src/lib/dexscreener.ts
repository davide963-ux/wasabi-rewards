/**
 * DexScreener client.
 *
 * No auth needed — they expose a public pair endpoint:
 *   GET https://api.dexscreener.com/latest/dex/pairs/solana/<pairAddress>
 *
 * Returns FDV / marketCap / priceUsd for the pair.
 */

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceUsd: string;
  fdv?: number;
  marketCap?: number;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
}

interface DexScreenerResponse {
  schemaVersion?: string;
  pairs?: DexScreenerPair[];
}

export interface MarketSnapshot {
  priceUsd: number;
  marketCap: number;
  fdv: number;
  liquidityUsd: number;
  volume24hUsd: number;
  pairAddress: string;
  baseSymbol: string;
}

export async function fetchMarketSnapshot(pairAddress: string): Promise<MarketSnapshot> {
  if (!pairAddress) throw new Error('pairAddress is required');

  const url = `https://api.dexscreener.com/latest/dex/pairs/solana/${pairAddress}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    // Vercel-friendly: don't cache the response
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`DexScreener HTTP ${res.status}`);

  const json = (await res.json()) as DexScreenerResponse;
  const pair = json.pairs?.[0];
  if (!pair) throw new Error('DexScreener returned no pairs for this address');

  return {
    priceUsd: parseFloat(pair.priceUsd ?? '0'),
    marketCap: pair.marketCap ?? pair.fdv ?? 0,
    fdv: pair.fdv ?? 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    volume24hUsd: pair.volume?.h24 ?? 0,
    pairAddress: pair.pairAddress,
    baseSymbol: pair.baseToken?.symbol ?? '',
  };
}
