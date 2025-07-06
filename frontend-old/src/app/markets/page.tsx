'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { FACTORY_ADDRESS } from '../../lib/wallet';
import factoryAbi from '../../abi/PredictionMarketFactory.json';
import AsciiBackground from '../../components/AsciiBackground';

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

export default function MarketsPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'resolved'>('all');
  const [marketDetails, setMarketDetails] = useState<MarketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [supportedProtocols, setSupportedProtocols] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component is mounted client-side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch markets directly using RPC
  useEffect(() => {
    if (!isMounted) return;

    const fetchMarketsData = async () => {
      try {
        setIsLoading(true);

        if (!FACTORY_ADDRESS) {
          throw new Error('FACTORY_ADDRESS is not defined');
        }

        // Get all markets and supported protocols in parallel
        const [allMarkets, protocols] = await Promise.all([
          publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: factoryAbi.abi,
            functionName: 'getAllMarkets',
          }),
          publicClient.readContract({
            address: FACTORY_ADDRESS,
            abi: factoryAbi.abi,
            functionName: 'getSupportedProtocols',
          })
        ]);

        setSupportedProtocols(protocols as string[]);

        if (allMarkets && (allMarkets as string[]).length > 0) {
          const markets = allMarkets as string[];
          const details: MarketInfo[] = [];
          
          // Fetch market details from our API
          for (const market of markets) {
            try {
              const result = await fetch(`/api/market/${market}`);
              
              if (!result.ok) continue;
              
              const data = await result.json();
              
              if (data && !data.error) {
                details.push(data);
              }
            } catch (error) {
              console.error(`Exception while fetching market ${market} details:`, error);
            }
          }
          
          setMarketDetails(details);
        } else {
          setMarketDetails([]);
        }
      } catch (error) {
        console.error('Error in fetchMarketsData:', error);
        setMarketDetails([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarketsData();
  }, [isMounted]);

  const filteredMarkets = marketDetails.filter(market => {
    const now = Date.now();
    const expiry = Number(market.expiry) * 1000;
    
    switch (filter) {
      case 'active':
        return !market.resolved && expiry > now;
      case 'expired':
        return !market.resolved && expiry <= now;
      case 'resolved':
        return market.resolved;
      default:
        return true;
    }
  });

  const formatTVL = (amount: number) => {
    if (amount === 0) return '$0';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const getMarketData = (market: MarketInfo) => {
    // For now, using placeholder values - will be replaced with real TVL data
    const insurePool = 0; // Real TVL for insure side
    const securePool = 0; // Real TVL for secure side
    const totalPool = insurePool + securePool;
    
    const insurePercent = totalPool > 0 ? Math.round((insurePool / totalPool) * 100) : 0;
    const securePercent = totalPool > 0 ? Math.round((securePool / totalPool) * 100) : 0;
    
    return {
      insurePool: formatTVL(insurePool),
      securePool: formatTVL(securePool),
      insurePercent: `${insurePercent}%`,
      securePercent: `${securePercent}%`,
      progressWidth: `${insurePercent}%`,
      canInsure: !market.resolved && Number(market.expiry) * 1000 > Date.now()
    };
  };

  return (
    <div className="min-h-screen bg-white text-black relative">
      <AsciiBackground />
      <div className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Header with Filters */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <span className="text-black font-medium">Filters:</span>
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All Markets' },
                { key: 'active', label: 'Active' },
                { key: 'expired', label: 'Expired' },
                { key: 'resolved', label: 'Resolved' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key as 'all' | 'active' | 'expired' | 'resolved')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === key
                      ? 'bg-[#00FA9A] text-black'
                      : 'bg-gray-200 text-black hover:bg-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-black font-medium">Supported Protocols:</span>
            <span className="text-[#00FA9A] font-bold text-lg">{supportedProtocols.length}</span>
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading markets...</p>
            </div>
          ) : filteredMarkets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-600 text-lg">No markets found</p>
            </div>
          ) : (
            filteredMarkets.map((market) => {
              const marketData = getMarketData(market);
              
              return (
                <div key={market.market} className="bg-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-[#00FA9A] transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 hover:shadow-xl">
                  <div className="mb-4">
                    <h3 className="font-faith text-2xl font-bold text-black mb-2">{market.protocol}</h3>
                    <p className="text-gray-600">Coverage period: {market.durationInDays} days</p>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Insure vs Secure</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-2">
                      <div 
                        className="bg-[#00FA9A] h-2 rounded-full transition-all duration-300"
                        style={{ width: marketData.progressWidth }}
                      ></div>
                    </div>
                  </div>

                  {/* Pool Data */}
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="text-2xl font-bold text-black">{marketData.insurePool}</div>
                      <div className="text-[#00FA9A] font-medium">{marketData.insurePercent}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-black">{marketData.securePool}</div>
                      <div className="text-gray-600 font-medium">{marketData.securePercent}</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <Link
                      href={`/market/${market.market}`}
                      className={`flex-1 py-3 px-4 rounded-lg font-bold text-center transition-all duration-200 transform ${
                        marketData.canInsure
                          ? 'bg-[#00FA9A] text-black hover:bg-[#00FA9A]/80 hover:scale-105 hover:shadow-lg'
                          : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      Insure
                    </Link>
                    <Link
                      href={`/market/${market.market}`}
                      className="flex-1 py-3 px-4 rounded-lg font-bold text-center bg-gray-300 text-black hover:bg-gray-400 transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                    >
                      Secure
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
} 