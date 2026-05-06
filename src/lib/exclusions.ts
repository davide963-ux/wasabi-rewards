/**
 * Default exclusions: token-account *owner* addresses we know are AMM /
 * routing programs and not real holders.
 *
 * These are program IDs whose vaults pool tokens for trading. Tokens held by
 * accounts owned by these programs should never count toward anyone's tier.
 *
 * Admin can also add custom exclusions via the admin UI.
 */

export const DEFAULT_EXCLUDED_OWNERS: ReadonlySet<string> = new Set([
  // Raydium AMM v4
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  // Raydium CLMM
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  // Raydium CPMM
  'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C',
  // Orca Whirlpools
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  // Meteora DLMM
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  // Meteora dynamic AMM
  'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB',
  // Jupiter aggregator program (token escrow during routing)
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  // Pump.fun bonding curve
  '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  // Phoenix
  'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
]);

/** Token mint addresses we consider "wrappers" / system addresses to also exclude. */
export const SYSTEM_OWNERS: ReadonlySet<string> = new Set([
  '11111111111111111111111111111111', // System Program
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token program
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022 program
]);
