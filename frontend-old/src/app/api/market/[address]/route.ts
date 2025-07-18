import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import marketAbi from '../../../../abi/PredictionMarketV2.json';

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const marketAddress = address;

    // Get individual market data from the market contract
    const [
      protocol,
      category, 
      question,
      endTime,
      marketInfo
    ] = await Promise.all([
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: marketAbi.abi,
        functionName: 'protocolName',
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: marketAbi.abi,
        functionName: 'category',
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: marketAbi.abi,
        functionName: 'question',
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: marketAbi.abi,
        functionName: 'endTime',
      }),
      publicClient.readContract({
        address: marketAddress as `0x${string}`,
        abi: marketAbi.abi,
        functionName: 'getMarketInfo',
      })
    ]);

    // Extract market info from the returned tuple
    const [
      yesPool,
      noPool,
      yesSupply,
      noSupply,
      yesPrice,
      noPrice,
      totalUsdcDeposited,
      platformFees,
      resolved,
      yesWon,
      frozen
    ] = marketInfo as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];

    // Calculate duration from current time and end time
    const currentTime = Math.floor(Date.now() / 1000);
    const endTimeNumber = Number(endTime);
    const durationInSeconds = endTimeNumber - currentTime;
    const durationInDays = Math.max(0, Math.ceil(durationInSeconds / (24 * 60 * 60)));

    // Format the response with string conversion for BigInt values
    const response = {
      market: marketAddress,
      protocol: String(protocol),
      category: String(category),
      expiry: String(endTime), // Convert BigInt to string
      durationInDays: String(durationInDays), // Convert to string for consistency
      question: String(question),
      exists: true,
      resolved: Boolean(resolved),
      yesPool: String(yesPool),
      noPool: String(noPool),
      yesSupply: String(yesSupply),
      noSupply: String(noSupply),
      totalUsdcDeposited: String(totalUsdcDeposited),
      frozen: Boolean(frozen),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching market details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market details' },
      { status: 500 }
    );
  }
} 