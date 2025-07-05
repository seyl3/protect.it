'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { USDC_ADDRESS } from '../../../lib/wallet';
import predictionMarketAbi from '../../../abi/PredictionMarket.json';
import predictionTokenAbi from '../../../abi/PredictionToken.json';
import mockUsdcAbi from '../../../abi/MockUSDC.json';

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

  const marketAddress = params.address as `0x${string}`;

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
      setNeedsApproval(BigInt(usdcAllowance) < amountWei);
    }
  }, [usdcAllowance, amount]);

  const handleApprove = async () => {
    if (!amount) return;
    
    try {
      await writeApprove({
        address: USDC_ADDRESS,
        abi: mockUsdcAbi.abi,
        functionName: 'approve',
        args: [marketAddress, parseEther(amount)],
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
          address: marketAddress,
          abi: predictionMarketAbi.abi,
          functionName: tokenType === 'yes' ? 'buyYes' : 'buyNo',
          args: [parseEther(amount)],
        });
      } else {
        await writeTrade({
          address: marketAddress,
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
        address: marketAddress,
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-faith text-2xl font-bold text-gray-900">
                  {marketInfo?.protocol ? String(marketInfo.protocol) : 'Loading...'} Insurance Market
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Market Address: {marketAddress}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Expires: {marketInfo?.expiry ? formatDate(marketInfo.expiry) : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  marketInfo?.resolved ? 'bg-gray-100 text-gray-800' : 
                  isExpired ? 'bg-[#00FA9A]/20 text-[#00FA9A]' : 
                  'bg-[#00FA9A]/20 text-[#00FA9A]'
                }`}>
                  {marketInfo?.resolved ? 'Resolved' : isExpired ? 'Expired' : 'Active'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Status */}
        {approveHash && (
          <TransactionInfo
            hash={approveHash}
            status={isApproveConfirmed ? 'success' : 'pending'}
            title={isApproveConfirmed ? 'Approval Confirmed' : 'Approval Pending'}
            description={isApproveConfirmed ? 'USDC spending approved successfully' : 'Approving USDC spending...'}
          />
        )}

        {tradeHash && (
          <TransactionInfo
            hash={tradeHash}
            status={isTradeConfirmed ? 'success' : 'pending'}
            title={isTradeConfirmed ? 'Trade Confirmed' : 'Trade Pending'}
            description={isTradeConfirmed ? 'Your trade has been executed successfully' : 'Processing your trade...'}
          />
        )}

        {claimHash && (
          <TransactionInfo
            hash={claimHash}
            status={isClaimConfirmed ? 'success' : 'pending'}
            title={isClaimConfirmed ? 'Claim Confirmed' : 'Claim Pending'}
            description={isClaimConfirmed ? 'Your winnings have been claimed successfully' : 'Processing your claim...'}
          />
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {(['trade', 'positions', 'info'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-[#00FA9A] text-[#00FA9A]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'trade' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Trade Form */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Trade Tokens</h3>
                    
                    <div className="space-y-4">
                      {/* Trade Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Action
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setTradeType('buy')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              tradeType === 'buy'
                                ? 'bg-[#00FA9A] text-black'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Buy
                          </button>
                          <button
                            onClick={() => setTradeType('sell')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              tradeType === 'sell'
                                ? 'bg-[#00FA9A] text-black'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            Sell
                          </button>
                        </div>
                      </div>

                      {/* Token Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Token Type
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setTokenType('yes')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              tokenType === 'yes'
                                ? 'bg-[#00FA9A] text-black'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            YES (Insurance)
                          </button>
                          <button
                            onClick={() => setTokenType('no')}
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              tokenType === 'no'
                                ? 'bg-[#00FA9A] text-black'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            NO (Bet Against)
                          </button>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (USDC)
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00FA9A]"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Balance: {usdcBalance ? formatEther(usdcBalance) : '0'} USDC
                        </p>
                      </div>

                      {/* Trade Button */}
                      <div className="space-y-2">
                        {needsApproval && tradeType === 'buy' && (
                          <button
                            onClick={handleApprove}
                            disabled={!amount || isApprovePending || isApproveConfirming}
                            className="w-full bg-[#00FA9A] text-black py-2 px-4 rounded-md hover:bg-[#00FA9A]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isApprovePending || isApproveConfirming ? 'Approving...' : 'Approve USDC'}
                          </button>
                        )}
                        
                        <button
                          onClick={handleTrade}
                          disabled={
                            !amount || 
                            (needsApproval && tradeType === 'buy') || 
                            isTradePending || 
                            isTradeConfirming ||
                            (marketInfo?.resolved && !isExpired)
                          }
                          className={`w-full py-2 px-4 rounded-md text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                            tradeType === 'buy' 
                              ? 'bg-[#00FA9A] hover:bg-[#00FA9A]/80' 
                              : 'bg-[#00FA9A] hover:bg-[#00FA9A]/80'
                          }`}
                        >
                          {isTradePending || isTradeConfirming ? 'Processing...' : 
                           `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${tokenType.toUpperCase()} Tokens`}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Market Stats */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Market Information</h3>
                    
                    {marketInfo && (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Protocol:</span>
                          <span className="text-sm font-medium">{marketInfo.protocol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Category:</span>
                          <span className="text-sm font-medium">{marketInfo.category}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Question:</span>
                          <span className="text-sm font-medium">{marketInfo.question}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Duration:</span>
                          <span className="text-sm font-medium">{marketInfo.durationInDays} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Status:</span>
                          <span className={`text-sm font-medium ${marketInfo.resolved ? 'text-gray-600' : isExpired ? 'text-[#00FA9A]' : 'text-[#00FA9A]'}`}>
                            {marketInfo.resolved ? 'Resolved' : isExpired ? 'Expired' : 'Active'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'positions' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Your Positions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-[#00FA9A]/20 border border-[#00FA9A] rounded-lg p-4">
                    <h4 className="font-medium text-[#00FA9A]">YES Tokens (Insurance)</h4>
                    <p className="text-2xl font-bold text-[#00FA9A] mt-2">
                      {yesBalance ? formatEther(yesBalance) : '0'}
                    </p>
                    <p className="text-sm text-[#00FA9A] mt-1">
                      Pays out if protocol gets hacked
                    </p>
                  </div>
                  
                  <div className="bg-[#00FA9A]/20 border border-[#00FA9A] rounded-lg p-4">
                    <h4 className="font-medium text-[#00FA9A]">NO Tokens (Bet Against)</h4>
                    <p className="text-2xl font-bold text-[#00FA9A] mt-2">
                      {noBalance ? formatEther(noBalance) : '0'}
                    </p>
                    <p className="text-sm text-[#00FA9A] mt-1">
                      Pays out if protocol remains secure
                    </p>
                  </div>
                </div>

                {(marketInfo?.resolved || isExpired) && (yesBalance || noBalance) && (
                  <div className="mt-6">
                    <button
                      onClick={handleClaim}
                      disabled={isClaimPending || isClaimConfirming}
                      className="bg-[#00FA9A] text-black py-2 px-4 rounded-md hover:bg-[#00FA9A]/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClaimPending || isClaimConfirming ? 'Claiming...' : 'Claim Winnings'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'info' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">Market Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Protocol</dt>
                      <dd className="mt-1 text-sm text-gray-900">{marketInfo?.protocol ? String(marketInfo.protocol) : 'Loading...'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Market Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">{marketAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">{marketInfo?.expiry ? formatDate(marketInfo.expiry) : 'Loading...'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          marketInfo?.resolved ? 'bg-gray-100 text-gray-800' : 
                          isExpired ? 'bg-[#00FA9A]/20 text-[#00FA9A]' : 
                          'bg-[#00FA9A]/20 text-[#00FA9A]'
                        }`}>
                          {marketInfo?.resolved ? 'Resolved' : isExpired ? 'Expired' : 'Active'}
                        </span>
                      </dd>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">YES Token Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                        {marketInfo?.yesToken ? String(marketInfo.yesToken) : 'Loading...'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">NO Token Address</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                        {marketInfo?.noToken ? String(marketInfo.noToken) : 'Loading...'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Network</dt>
                      <dd className="mt-1 text-sm text-gray-900">Flow EVM Mainnet</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Explorer</dt>
                      <dd className="mt-1 text-sm">
                        <a 
                          href={`https://evm.flowscan.io/address/${marketAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00FA9A] hover:text-[#00FA9A]/80"
                        >
                          View on Flow EVM Explorer →
                        </a>
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 