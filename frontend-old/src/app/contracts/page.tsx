'use client';

import { useState } from 'react';
import ContractInfo from '../../components/ContractInfo';
import { FACTORY_ADDRESS, USDC_ADDRESS } from '../../lib/wallet';

export default function ContractsPage() {
  const [customAddress, setCustomAddress] = useState('');

  const contractExamples = [
    {
      address: FACTORY_ADDRESS,
      name: 'Prediction Market Factory',
      description: 'Factory contract for creating prediction markets'
    },
    {
      address: USDC_ADDRESS,
      name: 'Mock USDC Token',
      description: 'ERC-20 token used for trading in markets'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Contract Explorer</h1>
          <p className="mt-2 text-gray-600">
            Explore and interact with Flow EVM contracts using our enhanced contract information display.
          </p>
        </div>

        {/* Custom Address Input */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Lookup Any Contract</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Enter contract address (0x...)"
              value={customAddress}
              onChange={(e) => setCustomAddress(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00FA9A]"
            />
            <button
              onClick={() => {/* Address will be displayed below */}}
              disabled={!customAddress || customAddress.length !== 42}
              className="px-4 py-2 bg-[#00FA9A] text-black rounded-md hover:bg-[#00FA9A]/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lookup
            </button>
          </div>
          
          {customAddress && customAddress.length === 42 && (
            <div className="mt-4">
              <ContractInfo 
                address={customAddress}
                name="Custom Contract"
                description="User-provided contract address"
              />
            </div>
          )}
        </div>

        {/* Example Contracts */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Protect.it Contracts</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contractExamples.map((contract, index) => (
              <ContractInfo
                key={index}
                address={contract.address}
                name={contract.name}
                description={contract.description}
              />
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-8 bg-[#00FA9A]/20 border border-[#00FA9A] rounded-lg p-6">
          <h2 className="text-lg font-medium text-blue-900 mb-4">Enhanced Contract Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Real-time Data</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Live contract balance from Flow EVM</li>
                <li>• Transaction count (nonce) information</li>
                <li>• Contract vs EOA detection</li>
                <li>• Network status indicators</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Interactive Features</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• One-click address copying</li>
                <li>• Direct links to Flow EVM explorer</li>
                <li>• Error handling with retry functionality</li>
                <li>• Responsive design for all devices</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Flow EVM Information */}
        <div className="mt-8 bg-gray-100 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">About Flow EVM Integration</h2>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              This contract explorer integrates with <strong>evm.flowscan.io</strong> to provide 
              comprehensive contract information directly from the Flow EVM network.
            </p>
            <p>
              All data is fetched in real-time using the Flow EVM JSON-RPC API, ensuring you always 
              have the most up-to-date contract information.
            </p>
            <div className="flex items-center space-x-4 mt-4">
              <a
                href="https://evm.flowscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Visit Flow EVM Explorer →
              </a>
              <a
                href="https://developers.flow.com/evm"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Flow EVM Documentation →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 