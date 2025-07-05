import { defineChain } from 'viem';
import { http } from 'wagmi';
import { createConfig } from '@privy-io/wagmi';

// Define Flow EVM Mainnet
export const flowEVM = defineChain({
  id: 747,
  name: 'Flow EVM',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://mainnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flow EVM Explorer',
      url: 'https://evm.flowscan.io',
    },
  },
});

// Wagmi configuration for Privy
export const wagmiConfig = createConfig({
  chains: [flowEVM],
  transports: {
    [flowEVM.id]: http(),
  },
});

// Legacy export for backward compatibility
export const config = wagmiConfig;

export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
export const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
export const ORACLE_ADDRESS = process.env.NEXT_PUBLIC_ORACLE_ADDRESS as `0x${string}`;

export const CHAIN_ID = 747; // Flow EVM mainnet 