// Shared payment configuration for both rails.

// ── Crypto rail: USDC on Base ────────────────────────────────────────
// We settle ticket sales in USDC (a USD stablecoin) on Base so that a $25
// ticket is always 25 USDC — no FX volatility for buyer or host.
export const BASE_CHAIN_ID = 8453; // Base mainnet
export const BASE_SEPOLIA_CHAIN_ID = 84532; // Base testnet (for sandbox testing)

// Canonical (Circle-issued) USDC contracts. 6 decimals on both networks.
export const USDC_ADDRESS: Record<number, `0x${string}`> = {
  [BASE_CHAIN_ID]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [BASE_SEPOLIA_CHAIN_ID]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};
export const USDC_DECIMALS = 6;

// Which chain the crypto rail operates on. Mirror the Square sandbox/prod
// switch: sandbox → Base Sepolia testnet, production → Base mainnet.
export const CRYPTO_CHAIN_ID =
  process.env.SQUARE_ENV === 'production' ? BASE_CHAIN_ID : BASE_SEPOLIA_CHAIN_ID;

// Platform fallback wallet that receives crypto ticket revenue when an event
// host has no wallet address on file. Optional — without it, crypto checkout
// is only offered for events whose host has a wallet.
export const PLATFORM_RECIPIENT_WALLET =
  (process.env.PAYMENT_RECIPIENT_WALLET as `0x${string}` | undefined) ?? null;

// $X.XX (cents) → USDC base units. cents has 2 decimals, USDC has 6, so we
// scale by 10^4. Returns a bigint (token base units) for on-chain comparison.
export function centsToUsdcBaseUnits(cents: number): bigint {
  return BigInt(Math.round(cents)) * BigInt(10) ** BigInt(USDC_DECIMALS - 2);
}

// Human display, e.g. 2500 → "25.00"
export function formatUsd(cents: number): string {
  return (cents / 100).toFixed(2);
}
