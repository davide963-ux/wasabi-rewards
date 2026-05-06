/**
 * Helius API client.
 *   - getTokenSupply (standard JSON-RPC) — total supply + decimals
 *   - getTokenAccounts (Helius DAS) — paginated list of every token account
 */

const HELIUS_RPC_URL = (apiKey: string) => `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: { code: number; message: string };
}

export interface TokenSupply {
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
}

interface TokenAccount {
  address: string;
  mint: string;
  owner: string;
  amount: number;
  delegated_amount: number;
  frozen: boolean;
}

interface GetTokenAccountsResponse {
  total: number;
  limit: number;
  cursor?: string;
  token_accounts: TokenAccount[];
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxAttempts = 4
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const wait = Math.min(1000 * 2 ** (attempt - 1), 8000);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const wait = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error(`fetchWithRetry exhausted: ${String(lastErr)}`);
}

export class HeliusClient {
  constructor(private readonly apiKey: string) {
    if (!apiKey) throw new Error('HELIUS_API_KEY is required');
  }

  async getTokenSupply(mint: string): Promise<TokenSupply> {
    const res = await fetchWithRetry(HELIUS_RPC_URL(this.apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'wasabi-supply',
        method: 'getTokenSupply',
        params: [mint],
      }),
    });
    if (!res.ok) throw new Error(`getTokenSupply HTTP ${res.status}`);
    const json = (await res.json()) as JsonRpcResponse<{ value: TokenSupply }>;
    if (json.error) throw new Error(`getTokenSupply: ${json.error.message}`);
    if (!json.result) throw new Error('getTokenSupply: empty result');
    return json.result.value;
  }

  async *iterateTokenAccounts(mint: string, pageSize = 1000): AsyncGenerator<TokenAccount[]> {
    let cursor: string | undefined;
    let pagesFetched = 0;
    const MAX_PAGES = 1000;

    do {
      const res = await fetchWithRetry(HELIUS_RPC_URL(this.apiKey), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: `wasabi-accounts-${pagesFetched}`,
          method: 'getTokenAccounts',
          params: { mint, limit: pageSize, cursor },
        }),
      });
      if (!res.ok) throw new Error(`getTokenAccounts HTTP ${res.status}`);
      const json = (await res.json()) as JsonRpcResponse<GetTokenAccountsResponse>;
      if (json.error) throw new Error(`getTokenAccounts: ${json.error.message}`);
      if (!json.result) throw new Error('getTokenAccounts: empty result');

      const page = json.result;
      yield page.token_accounts;

      cursor = page.cursor;
      pagesFetched++;
      if (pagesFetched >= MAX_PAGES) {
        throw new Error(`Pagination safety stop hit at ${MAX_PAGES} pages`);
      }
    } while (cursor);
  }
}

export type { TokenAccount };
