import { parseUnits, formatUnits } from 'viem';

// USDC typically has 6 decimals, but we'll make it configurable
export const USDC_DECIMALS = 6;

export function parseUSDC(amount: string): bigint {
  return parseUnits(amount, USDC_DECIMALS);
}

export function formatUSDC(amount: bigint): string {
  return formatUnits(amount, USDC_DECIMALS);
} 