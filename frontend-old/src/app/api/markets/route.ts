import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { FACTORY_ADDRESS } from '../../../lib/wallet';
import factoryAbi from '../../../abi/PredictionMarketFactory.json';

// Define Flow EVM Mainnet
const flowEVM = defineChain({
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

const publicClient = createPublicClient({
  chain: flowEVM,
  transport: http()
});

export async function GET() {
  try {
    // Get all markets from the factory
    const allMarkets = await publicClient.readContract({
      address: FACTORY_ADDRESS,
      abi: factoryAbi.abi,
      functionName: 'getAllMarkets',
    });

    if (!allMarkets || !(allMarkets as string[]).length) {
      return NextResponse.json([]);
    }

    const markets = (allMarkets as string[]).map((market) => ({
      market,
      // Add timestamp for sorting (most recent first)
      timestamp: Date.now()
    }));

    // Sort by most recent first (reverse chronological order)
    markets.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json(markets);
  } catch (error) {
    console.error('Error fetching markets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch markets' },
      { status: 500 }
    );
  }
} 