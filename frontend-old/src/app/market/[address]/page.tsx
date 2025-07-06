'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { USDC_ADDRESS } from '../../../lib/wallet';
import predictionMarketAbi from '../../../abi/PredictionMarket.json';
import predictionTokenAbi from '../../../abi/PredictionToken.json';
import mockUsdcAbi from '../../../abi/MockUSDC.json';
import ContractStyleTrading from '../../../components/ContractStyleTrading';
import ClientOnly from '../../../components/ClientOnly';
import AsciiBackground from '../../../components/AsciiBackground';

interface MarketInfo {
  market: string;
  yesToken: string;
  noToken: string;
  protocol: string;
  category: string;
  expiry: string;
  durationInDays: string;
  question: string;
  exists: boolean;
  resolved: boolean;
}

// Transaction info component
function TransactionInfo({ 
  hash, 
  status, 
  title, 
  description 
}: {
  hash: string;
  status: 'pending' | 'success' | 'error';
  title: string;
  description: string;
}) {
  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#00FA9A';
      case 'error': return '#00FA9A';
      case 'pending': return '#00FA9A';
      default: return 'gray';
    }
  };

  const color = getStatusColor();

  return (
    <div className={`mb-6 bg-${color}-50 border border-${color}-200 rounded-md p-4`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {status === 'success' && (
            <svg className={`h-5 w-5 text-${color}-400`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {status === 'pending' && (
            <svg className={`animate-spin h-5 w-5 text-${color}-400`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {status === 'error' && (
            <svg className={`h-5 w-5 text-${color}-400`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium text-${color}-800`}>{title}</h3>
          <div className={`mt-2 text-sm text-${color}-700`}>
            <p>{description}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center">
                <span className="font-medium">Transaction Hash:</span>
                              <a
                href={`https://evm.flowscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-2 text-${color}-600 hover:text-${color}-800 font-mono text-xs break-all`}
              >
                {hash}
              </a>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Network:</span>
                <span className="ml-2">Flow EVM Mainnet</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium">Explorer:</span>
                              <a
                href={`https://evm.flowscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-2 text-${color}-600 hover:text-${color}-800`}
              >
                View on Flow EVM Explorer →
              </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MarketPage() {
  const params = useParams();
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'trade' | 'positions' | 'info'>('trade');
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tokenType, setTokenType] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);
  const [marketInfo, setMarketInfo] = useState<MarketInfo | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(true);
  const [initialAction, setInitialAction] = useState<'insure' | 'secure' | undefined>();

  const marketAddress = params.address as string;

  // Extract action from URL parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const action = urlParams.get('action');
      if (action === 'insure' || action === 'secure') {
        setInitialAction(action);
      }
    }
  }, []);

  // Fetch market info from our API
  useEffect(() => {
    const fetchMarketInfo = async () => {
      try {
        setIsLoadingMarket(true);
        console.log('Fetching market info for:', marketAddress);
        
        const response = await fetch(`/api/market/${marketAddress}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Market info received:', data);
          setMarketInfo(data);
        } else {
          console.error('Failed to fetch market info:', response.status);
        }
      } catch (error) {
        console.error('Error fetching market info:', error);
      } finally {
        setIsLoadingMarket(false);
      }
    };

    if (marketAddress) {
      fetchMarketInfo();
    }
  }, [marketAddress]);

  // Keep the wagmi calls for trading functionality, but remove the non-existent functions
  const { data: yesBalance } = useReadContract({
    address: marketInfo?.yesToken as `0x${string}`,
    abi: predictionTokenAbi.abi,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!marketInfo?.yesToken && !!address }
  });

  const { data: noBalance } = useReadContract({
    address: marketInfo?.noToken as `0x${string}`,
    abi: predictionTokenAbi.abi,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!marketInfo?.noToken && !!address }
  });

  // Read USDC balance and allowance
  const { data: usdcBalance } = useReadContract({
    address: USDC_ADDRESS,
    abi: mockUsdcAbi.abi,
    functionName: 'balanceOf',
    args: [address],
    query: { enabled: !!address }
  });

  const { data: usdcAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: mockUsdcAbi.abi,
    functionName: 'allowance',
    args: [address, marketAddress],
    query: { enabled: !!address }
  });

  // Contract write hooks
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeTrade, data: tradeHash, isPending: isTradePending } = useWriteContract();
  const { writeContract: writeClaim, data: claimHash, isPending: isClaimPending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isTradeConfirming, isSuccess: isTradeConfirmed } = useWaitForTransactionReceipt({
    hash: tradeHash,
  });

  const { isLoading: isClaimConfirming, isSuccess: isClaimConfirmed } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // Check if approval is needed
  useEffect(() => {
    if (usdcAllowance && amount) {
      const amountWei = parseEther(amount);
      setNeedsApproval(BigInt(usdcAllowance as string) < amountWei);
    }
  }, [usdcAllowance, amount]);

  const handleApprove = async () => {
    if (!amount) return;
    
    try {
              await writeApprove({
          address: USDC_ADDRESS,
          abi: mockUsdcAbi.abi,
          functionName: 'approve',
          args: [marketAddress as `0x${string}`, parseEther(amount)],
        });
    } catch (err) {
      console.error('Error approving USDC:', err);
    }
  };

  const handleTrade = async () => {
    if (!amount) return;
    
    try {
      if (tradeType === 'buy') {
        await writeTrade({
          address: marketAddress as `0x${string}`,
          abi: predictionMarketAbi.abi,
          functionName: tokenType === 'yes' ? 'buyYes' : 'buyNo',
          args: [parseEther(amount)],
        });
      } else {
        await writeTrade({
          address: marketAddress as `0x${string}`,
          abi: predictionMarketAbi.abi,
          functionName: tokenType === 'yes' ? 'sellYes' : 'sellNo',
          args: [parseEther(amount)],
        });
      }
    } catch (err) {
      console.error('Error trading:', err);
    }
  };

  const handleClaim = async () => {
    try {
      await writeClaim({
        address: marketAddress as `0x${string}`,
        abi: predictionMarketAbi.abi,
        functionName: 'claimWinnings',
        args: [],
      });
    } catch (err) {
      console.error('Error claiming winnings:', err);
    }
  };

  const formatDate = (timestamp: string | bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleDateString();
  };

  const isExpired = marketInfo?.expiry ? Number(marketInfo.expiry) * 1000 < Date.now() : false;

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading market...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 py-8 relative">
        <AsciiBackground />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="font-faith text-6xl font-bold text-black mb-4">
              {marketInfo?.protocol ? `${marketInfo.protocol} Insurance Market` : 'Loading Market...'}
            </h1>
            <p className="text-gray-600 text-lg">
              Decentralized smart contract insurance trading
            </p>
          </div>

          {isLoadingMarket ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading market details...</p>
            </div>
          ) : marketInfo ? (
            <ContractStyleTrading 
              marketAddress={marketAddress}
              marketInfo={marketInfo}
              initialAction={initialAction}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg">Market not found or failed to load</p>
            </div>
          )}
        </div>
      </div>
    </ClientOnly>
  );
} 