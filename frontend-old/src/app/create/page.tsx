'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
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

  // Available protocols
  const protocols = [
    'Uniswap', 'Aave', 'Compound', 'MakerDAO', 'Curve', 'SushiSwap', 
    'Yearn', 'Balancer', 'Synthetix', 'dYdX', 'Bancor', 'Kyber'
  ];

  // Available durations
  const durations = [
    { label: '7 days', value: '7' },
    { label: '14 days', value: '14' },
    { label: '30 days', value: '30' },
    { label: '60 days', value: '60' },
    { label: '90 days', value: '90' },
    { label: '180 days', value: '180' }
  ];

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

  const handleCreateMarket = () => {
    if (!isConnected) return;
    setShowForm(true);
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
        <CreateMarketForm 
          preselectedProtocol={selectedProtocol}
          preselectedDuration={selectedDays}
        />
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
        
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-4xl mx-auto text-center">
            
            {/* Blurry question that appears */}
            <div className={`transition-all duration-1000 ease-out ${
              showQuestion 
                ? 'opacity-100 blur-0 translate-y-0' 
                : 'opacity-0 blur-sm translate-y-8'
            }`}>
              <h1 className="font-faith text-6xl font-bold text-black mb-12">
                Create Insurance Market
              </h1>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-gray-200">
                <p className="text-3xl text-gray-800 mb-12 leading-relaxed">
                  I want to launch an insurance market for{' '}
                  
                  {/* Protocol Dropdown */}
                  <span className="relative inline-block mx-2">
                    <select
                      value={selectedProtocol}
                      onChange={(e) => setSelectedProtocol(e.target.value)}
                      className={`appearance-none bg-[#00FA9A] text-black font-bold text-3xl px-6 py-3 rounded-xl border-2 border-[#00FA9A] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#00FA9A]/30 ${
                        !selectedProtocol ? 'text-gray-600' : ''
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
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </span>
                  
                  protocol, with expiry date in{' '}
                  
                  {/* Duration Dropdown */}
                  <span className="relative inline-block mx-2">
                    <select
                      value={selectedDays}
                      onChange={(e) => setSelectedDays(e.target.value)}
                      className={`appearance-none bg-[#00FA9A] text-black font-bold text-3xl px-6 py-3 rounded-xl border-2 border-[#00FA9A] cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#00FA9A]/30 ${
                        !selectedDays ? 'text-gray-600' : ''
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
                      <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className={`px-12 py-6 rounded-2xl font-bold text-2xl transition-all duration-300 transform hover:scale-105 ${
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
                  <p className="mt-6 text-gray-600 text-lg">
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