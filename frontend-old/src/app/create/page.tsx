'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useRouter } from 'next/navigation';
import { FACTORY_ADDRESS } from '../../lib/wallet';
import factoryAbi from '../../abi/PredictionMarketFactoryV2.json';
import ClientOnly from '../../components/ClientOnly';
import CreateMarketForm from '../../components/CreateMarketForm';
import AsciiBackground from '../../components/AsciiBackground';

function CreateMarketContent() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [showQuestion, setShowQuestion] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState('');
  const [selectedDays, setSelectedDays] = useState('');
  const [showCreateButton, setShowCreateButton] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionError, setTransactionError] = useState<Error | null>(null);
  const [deployedMarketAddress, setDeployedMarketAddress] = useState<string | null>(null);

  // Get supported protocols from contract
  const { data: supportedProtocols } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getSupportedProtocols',
  });

  // Get supported durations from contract
  const { data: supportedDurations } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi.abi,
    functionName: 'getSupportedDurations',
  });

  // Convert contract data to usable format
  const protocols = supportedProtocols ? (supportedProtocols as string[]) : [];
  const durations = supportedDurations 
    ? (supportedDurations as bigint[]).map(d => ({
        value: Number(d).toString(),
        label: `${Number(d)} days`
      }))
    : [];

  // Contract write hook
  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();

  // Wait for transaction
  const { 
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Show question with animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowQuestion(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Show create button when both selections are made
  useEffect(() => {
    if (selectedProtocol && selectedDays) {
      const timer = setTimeout(() => {
        setShowCreateButton(true);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setShowCreateButton(false);
    }
  }, [selectedProtocol, selectedDays]);

  // Handle transaction states and get deployed market address
  useEffect(() => {
    if (isConfirmed && hash) {
      setIsSubmitting(false);
      setTransactionError(null);
      
      // Fetch the deployed market address from the latest market
      const fetchDeployedAddress = async () => {
        try {
          // Wait a bit for the blockchain to update
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Get all markets from the factory
          const response = await fetch('/api/markets');
          if (response.ok) {
            const markets = await response.json();
            if (markets && markets.length > 0) {
              // Get the most recent market (should be the one we just deployed)
              const latestMarket = markets[0];
              setDeployedMarketAddress(latestMarket.market);
            }
          }
        } catch (error) {
          console.error('Error fetching deployed market address:', error);
        }
      };
      
      fetchDeployedAddress();
    } else if (confirmError) {
      setTransactionError(confirmError instanceof Error ? confirmError : new Error(String(confirmError)));
      setIsSubmitting(false);
    }
  }, [isConfirmed, confirmError, hash]);

  const handleCreateMarket = () => {
    if (!isConnected) return;
    setShowForm(true);
  };

  const handleDirectCreateMarket = async () => {
    if (!selectedProtocol || !selectedDays) return;

    setIsSubmitting(true);
    setTransactionError(null);
    
    try {
      console.log('Creating market with:', { protocol: selectedProtocol, duration: selectedDays });
      console.log('Factory address:', FACTORY_ADDRESS);
      
      await writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi.abi,
        functionName: 'deployMarket',
        args: [selectedProtocol, parseInt(selectedDays)],
        gas: BigInt(5000000), // Add explicit gas limit for Flow EVM
      });
      
      console.log('Transaction submitted successfully');
    } catch (err) {
      console.error('Error creating market:', err);
      if (err instanceof Error) {
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        setTransactionError(err);
      }
      setIsSubmitting(false);
    }
  };

  if (showForm) {
    return (
      <ClientOnly fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }>
        <div className="min-h-screen bg-gray-50 relative overflow-hidden">
          <AsciiBackground />
          
          <div className="relative z-10 max-w-6xl mx-auto py-12 px-4">
            {/* How it Works Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-200 mb-8">
              <h2 className="text-3xl font-bold text-black mb-6">How it Works</h2>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[#00FA9A]/10 rounded-xl p-6 border border-[#00FA9A]/30">
                  <h3 className="text-xl font-bold text-[#00FA9A] mb-3">YES Tokens (Insurance)</h3>
                  <p className="text-black">
                    Buy YES tokens to insure against protocol hacks. If the protocol gets hacked, you receive payouts.
                  </p>
                </div>
                
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-xl font-bold text-red-800 mb-3">NO Tokens (Betting)</h3>
                  <p className="text-gray-700">
                    Buy NO tokens to bet against hacks. If the protocol remains secure, you earn returns.
                  </p>
                </div>
              </div>
            </div>

            {/* Market Details Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-200">
              <h2 className="text-2xl font-bold text-black mb-4">Market Details</h2>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">Protocol:</span>
                    <p className="text-base text-black">{selectedProtocol}</p>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">Duration:</span>
                    <p className="text-base text-black">{selectedDays} days</p>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">Network:</span>
                    <p className="text-base text-black">Flow EVM Mainnet</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">YES Token Name:</span>
                    <p className="text-base text-black font-mono">YEShack-{selectedDays}d-{selectedProtocol}</p>
                  </div>
                  
                  <div>
                    <span className="font-semibold text-gray-700 text-sm">NO Token Name:</span>
                    <p className="text-base text-black font-mono">NOhack-{selectedDays}d-{selectedProtocol}</p>
                  </div>
                </div>
              </div>

              {/* Transaction Status */}
              {isConfirmed && hash && (
                <div className="mt-4 bg-[#00FA9A]/20 border border-[#00FA9A] rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[#00FA9A]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-black">Market Created Successfully!</h3>
                      <div className="mt-2 text-sm text-black">
                        <p>Your insurance market has been deployed on Flow EVM.</p>
                        {deployedMarketAddress && (
                          <div className="mt-2">
                            <button
                              onClick={() => router.push(`/market/${deployedMarketAddress}`)}
                              className="bg-[#00FA9A] text-black py-2 px-4 rounded-lg font-bold hover:bg-[#00FA9A]/80 transition-all duration-300"
                            >
                              Go to Market →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(transactionError || writeError || confirmError) && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4 max-w-full overflow-hidden">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-red-800">Error Creating Market</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p className="error-text-wrap">{(transactionError || writeError || confirmError) instanceof Error ? (transactionError || writeError || confirmError)?.message : String(transactionError || writeError || confirmError)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Create Market Button Only */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleDirectCreateMarket}
                  disabled={isPending || isConfirming || isSubmitting}
                  className={`font-bold text-xl px-8 py-4 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-2xl ${
                    isPending || isConfirming || isSubmitting
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00FA9A] to-green-400 text-black hover:from-green-400 hover:to-[#00FA9A] hover:shadow-[#00FA9A]/30'
                  }`}
                >
                  {isPending || isConfirming || isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {isPending ? 'Creating...' : 'Confirming...'}
                    </span>
                  ) : (
                    'Create Market'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gray-50 relative overflow-hidden">
        <AsciiBackground />
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
          {/* Big Title Outside Container */}
          <div className={`w-full text-center mb-12 transition-all duration-1000 ease-out ${
            showQuestion 
              ? 'opacity-100 blur-0 translate-y-0' 
              : 'opacity-0 blur-sm translate-y-8'
          }`}>
            <h1 className="font-faith font-bold text-black" style={{ fontSize: '5rem', lineHeight: '1.2' }}>
              Create an <span className="font-faith">Insurance Market</span>
            </h1>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            
            {/* Form Section */}
            <div className={`transition-all duration-1000 ease-out ${
              showQuestion 
                ? 'opacity-100 blur-0 translate-y-0' 
                : 'opacity-0 blur-sm translate-y-8'
            }`}>
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-gray-200">
                <p className="text-xl text-gray-800 mb-8 leading-relaxed">
                  I want to launch an <span className="font-faith text-2xl">insurance market</span> for{' '}
                  
                  {/* Protocol Dropdown */}
                  <span className="relative inline-block mx-2">
                    <select
                      value={selectedProtocol}
                      onChange={(e) => setSelectedProtocol(e.target.value)}
                      className={`appearance-none bg-white border-2 border-[#00FA9A] text-black font-bold text-lg px-3 py-1 pr-8 rounded-lg cursor-pointer transition-all duration-300 hover:border-[#00FA9A]/80 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00FA9A] focus:border-[#00FA9A] ${
                        !selectedProtocol ? 'text-gray-500' : ''
                      }`}
                    >
                      <option value="" disabled>select protocol</option>
                      {protocols.map((protocol) => (
                        <option key={protocol} value={protocol} className="text-black">
                          {protocol}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-[#00FA9A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </span>
                  
                  <span className="font-faith text-2xl">protocol</span>, with expiry date in{' '}
                  
                  {/* Duration Dropdown */}
                  <span className="relative inline-block mx-2">
                    <select
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(e.target.value)}
                      className={`appearance-none bg-white border-2 border-[#00FA9A] text-black font-bold text-lg px-3 py-1 pr-8 rounded-lg cursor-pointer transition-all duration-300 hover:border-[#00FA9A]/80 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#00FA9A] focus:border-[#00FA9A] ${
                        !selectedDays ? 'text-gray-500' : ''
                      }`}
                    >
                      <option value="" disabled>select days</option>
                      {durations.map((duration) => (
                        <option key={duration.value} value={duration.value} className="text-black">
                          {duration.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                      <svg className="w-4 h-4 text-[#00FA9A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </span>
                </p>

                {/* Create Market Button */}
                <div className={`transition-all duration-500 ease-out ${
                  showCreateButton 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-4'
                }`}>
                  <button
                    onClick={handleCreateMarket}
                    disabled={!isConnected || !selectedProtocol || !selectedDays}
                    className={`px-8 py-4 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 ${
                      isConnected && selectedProtocol && selectedDays
                        ? 'bg-gradient-to-r from-[#00FA9A] to-green-400 text-black hover:from-green-400 hover:to-[#00FA9A] shadow-2xl hover:shadow-[#00FA9A]/30'
                        : 'bg-gray-400/50 text-gray-500 cursor-not-allowed backdrop-blur-sm'
                    }`}
                  >
                    {!isConnected 
                      ? 'Connect Your Account'
                      : !selectedProtocol || !selectedDays
                      ? 'Complete Selection'
                      : 'Create Market'
                    }
                  </button>
                </div>

                {/* Connection Status */}
                {!isConnected && (
                  <p className="mt-6 text-gray-600 text-sm italic">
                    Please connect your wallet to create an insurance market
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}

export default function CreateMarket() {
  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00FA9A] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreateMarketContent />
    </ClientOnly>
  );
} 