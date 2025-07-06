'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { USDC_ADDRESS } from '../lib/wallet';
import { parseUSDC, formatUSDC } from '../lib/usdcUtils';
import predictionMarketAbi from '../abi/PredictionMarket.json';
import predictionTokenAbi from '../abi/PredictionToken.json';
import mockUsdcAbi from '../abi/MockUSDC.json';
import SigningAnimation from './SigningAnimation';

interface ContractStyleTradingProps {
  marketAddress: string;
  marketInfo: {
    protocol: string;
    expiry: string;
    yesToken: string;
    noToken: string;
    resolved: boolean;
  } | null;
  initialAction?: 'insure' | 'secure';
}

export default function ContractStyleTrading({ marketAddress, marketInfo, initialAction }: ContractStyleTradingProps) {
  const { address } = useAccount();
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tokenType, setTokenType] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [needsApproval, setNeedsApproval] = useState(false);

  // Set default values based on initial action
  useEffect(() => {
    if (initialAction) {
      setTradeType('buy');
      if (initialAction === 'insure') {
        setTokenType('yes');
      } else if (initialAction === 'secure') {
        setTokenType('no');
      }
    }
  }, [initialAction]);

  // Read balances
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
    args: [address, marketAddress as `0x${string}`],
    query: { enabled: !!address }
  });

  // Contract write hooks
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeTrade, data: tradeHash, isPending: isTradePending } = useWriteContract();

  // Transaction receipts
  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isTradeConfirming, isSuccess: isTradeConfirmed } = useWaitForTransactionReceipt({
    hash: tradeHash,
  });

  // Check if approval is needed
  useEffect(() => {
    if (usdcAllowance && amount) {
      const amountUsdc = parseUSDC(amount);
      setNeedsApproval((usdcAllowance as bigint) < amountUsdc);
    }
  }, [usdcAllowance, amount]);

  const handleApprove = async () => {
    if (!amount) return;
    
    try {
      await writeApprove({
        address: USDC_ADDRESS,
        abi: mockUsdcAbi.abi,
        functionName: 'approve',
        args: [marketAddress as `0x${string}`, parseUSDC(amount)],
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
          args: [parseUSDC(amount)],
        });
      } else {
        await writeTrade({
          address: marketAddress as `0x${string}`,
          abi: predictionMarketAbi.abi,
          functionName: tokenType === 'yes' ? 'sellYes' : 'sellNo',
          args: [parseUSDC(amount)],
        });
      }
    } catch (err) {
      console.error('Error trading:', err);
    }
  };

  const isExpired = marketInfo?.expiry ? Number(marketInfo.expiry) * 1000 < Date.now() : false;
  const isTransactionPending = isApprovePending || isTradePending || isApproveConfirming || isTradeConfirming;

  return (
    <>
      {/* Contract-style trading interface */}
      <div className="bg-white border-2 border-gray-800 rounded-xl shadow-2xl max-w-4xl mx-auto overflow-hidden" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f5f5f5" fill-opacity="0.4"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3Ccircle cx="53" cy="7" r="1"/%3E%3Ccircle cx="30" cy="30" r="1"/%3E%3Ccircle cx="7" cy="53" r="1"/%3E%3Ccircle cx="53" cy="53" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}>
        {/* Contract Header */}
        <div className="bg-white text-black p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black mb-1">INSURANCE CONTRACT</h1>
              <p className="text-gray-600 text-sm">Smart Contract Trading Agreement</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Contract No.</div>
              <div className="font-mono text-xs text-black font-bold">{marketAddress.slice(0, 10)}...</div>
            </div>
          </div>
        </div>

        {/* Contract Body */}
        <div className="p-8 space-y-8">
          {/* Parties Section */}
          <div className="border-b border-gray-300 pb-6">
            <h2 className="text-xl font-bold text-black mb-4">PARTIES TO THE CONTRACT</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300">
                <h3 className="font-bold text-black mb-2">PROTOCOL UNDER COVERAGE</h3>
                <p className="text-lg font-mono text-gray-800">{marketInfo?.protocol || 'Loading...'}</p>
                <p className="text-sm text-gray-600 mt-1">DeFi Protocol</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300">
                <h3 className="font-bold text-black mb-2">COUNTERPARTY</h3>
                <p className="text-sm font-mono text-gray-800">{address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not Connected'}</p>
                <p className="text-sm text-gray-600 mt-1">Wallet Address</p>
              </div>
            </div>
          </div>

          {/* Contract Terms */}
          <div className="border-b border-gray-300 pb-6">
            <h2 className="text-xl font-bold text-black mb-4">CONTRACT TERMS</h2>
            
            {/* Trade Type Selection */}
            <div className="mb-6">
              <h3 className="font-bold text-black mb-3">TRANSACTION TYPE</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTradeType('buy')}
                  className={`p-4 rounded-lg border-2 font-bold transition-all duration-300 transform hover:scale-105 ${
                    tradeType === 'buy'
                      ? 'border-[#00FA9A] bg-[#00FA9A]/20 text-[#00FA9A] shadow-lg shadow-[#00FA9A]/20'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-[#00FA9A]/50 hover:bg-[#00FA9A]/10'
                  }`}
                >
                  <div className="text-lg">PURCHASE</div>
                  <div className="text-xs opacity-80">Acquire Position</div>
                </button>
                <button
                  onClick={() => setTradeType('sell')}
                  className={`p-4 rounded-lg border-2 font-bold transition-all duration-300 transform hover:scale-105 ${
                    tradeType === 'sell'
                      ? 'border-red-500 bg-red-100 text-red-800 shadow-lg shadow-red-500/20'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-red-400 hover:bg-red-50'
                  }`}
                >
                  <div className="text-lg text-red-600">LIQUIDATE</div>
                  <div className="text-xs opacity-80 text-red-600">Exit Position</div>
                </button>
              </div>
            </div>

            {/* Position Type */}
            <div className="mb-6">
              <h3 className="font-bold text-black mb-3">POSITION TYPE</h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTokenType('yes')}
                  className={`p-4 rounded-lg border-2 font-bold transition-all duration-300 transform hover:scale-105 ${
                    tokenType === 'yes'
                      ? 'border-[#00FA9A] bg-[#00FA9A]/20 text-[#00FA9A] shadow-lg shadow-[#00FA9A]/20'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-[#00FA9A]/50 hover:bg-[#00FA9A]/10'
                  }`}
                >
                  <div className="text-lg">INSURANCE</div>
                  <div className="text-xs opacity-80">Protection Against Hack</div>
                  <div className="text-xs mt-2 font-mono bg-gray-200 px-2 py-1 rounded text-gray-800">
                    Balance: {yesBalance ? formatEther(yesBalance as bigint) : '0'} YES
                  </div>
                </button>
                <button
                  onClick={() => setTokenType('no')}
                  className={`p-4 rounded-lg border-2 font-bold transition-all duration-300 transform hover:scale-105 ${
                    tokenType === 'no'
                      ? 'border-[#00FA9A] bg-[#00FA9A]/20 text-[#00FA9A] shadow-lg shadow-[#00FA9A]/20'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-[#00FA9A]/50 hover:bg-[#00FA9A]/10'
                  }`}
                >
                  <div className="text-lg">SECURITY BET</div>
                  <div className="text-xs opacity-80">Bet Against Hack</div>
                  <div className="text-xs mt-2 font-mono bg-gray-200 px-2 py-1 rounded text-gray-800">
                    Balance: {noBalance ? formatEther(noBalance as bigint) : '0'} NO
                  </div>
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <h3 className="font-bold text-black mb-3">CONTRACT VALUE</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-300 hover:border-gray-400 transition-all duration-300">
                <label className="block text-sm font-bold text-black mb-2">
                  Amount (USDC)
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full text-2xl font-mono p-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-all duration-300"
                />
                
                {/* Quick Amount Buttons */}
                <div className="mt-3 mb-2">
                  <p className="text-sm font-bold text-black mb-2">Quick Amounts:</p>
                  <div className="flex flex-wrap gap-2">
                    {[10, 50, 100, 1000, 10000].map((quickAmount) => (
                      <button
                        key={quickAmount}
                        onClick={() => setAmount(quickAmount.toString())}
                        className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm font-mono text-black hover:border-[#00FA9A] hover:bg-[#00FA9A]/10 transition-all duration-200 transform hover:scale-105"
                      >
                        {quickAmount >= 1000 ? `${quickAmount / 1000}K` : quickAmount}
                      </button>
                    ))}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-2">
                  Available Balance: <span className="text-black font-mono">{usdcBalance ? formatUSDC(usdcBalance as bigint) : '0'} USDC</span>
                </p>
              </div>
            </div>
          </div>

          {/* Contract Execution */}
          <div>
            <h2 className="text-xl font-bold text-black mb-4">CONTRACT EXECUTION</h2>
            
            <div className="space-y-4">
              {needsApproval && tradeType === 'buy' && (
                <button
                  onClick={handleApprove}
                  disabled={!amount || isApprovePending || isApproveConfirming}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-400 text-black py-4 px-6 rounded-lg font-bold text-lg hover:from-yellow-400 hover:to-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-yellow-500/20"
                >
                  {isApprovePending || isApproveConfirming ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      AUTHORIZING PAYMENT...
                    </div>
                  ) : (
                    'AUTHORIZE PAYMENT'
                  )}
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
                className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                  tradeType === 'buy' 
                    ? 'bg-gradient-to-r from-[#00FA9A] to-[#00FA9A]/80 text-black hover:from-[#00FA9A]/90 hover:to-[#00FA9A]/70 hover:shadow-[#00FA9A]/20' 
                    : 'bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 hover:shadow-red-500/20'
                }`}
              >
                {isTradePending || isTradeConfirming ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    EXECUTING CONTRACT...
                  </div>
                ) : (
                  `${tradeType === 'buy' ? 'EXECUTE PURCHASE' : 'EXECUTE LIQUIDATION'} - ${tokenType.toUpperCase()}`
                )}
              </button>
            </div>

            {/* Contract Footer */}
            <div className="mt-8 pt-6 border-t border-gray-300">
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div>
                  <p className="font-bold text-black">Contract Expires:</p>
                  <p className="text-gray-800">{marketInfo?.expiry ? new Date(Number(marketInfo.expiry) * 1000).toLocaleDateString() : 'Loading...'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-black">Network:</p>
                  <p className="text-gray-800">Flow EVM Mainnet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signing Animation */}
      <SigningAnimation 
        isVisible={isTransactionPending}
        message={
          isApprovePending || isApproveConfirming ? "Authorizing payment..." :
          isTradePending || isTradeConfirming ? "Executing contract..." :
          "Processing transaction..."
        }
      />
    </>
  );
} 