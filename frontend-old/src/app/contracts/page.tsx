'use client';

import ContractInfo from '../../components/ContractInfo';
import { FACTORY_ADDRESS, USDC_ADDRESS } from '../../lib/wallet';

// Mock Oracle address - replace with actual address when deployed
const MOCK_ORACLE_ADDRESS = '0x0000000000000000000000000000000000000000';

export default function ContractsPage() {
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
    },
    {
      address: MOCK_ORACLE_ADDRESS,
      name: 'Mock Oracle',
      description: 'Oracle contract for market resolution and price feeds'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Smart Contracts</h1>
          <p className="mt-2 text-gray-600">
            Core contracts powering the Protect.it insurance protocol on Flow EVM.
          </p>
        </div>

        {/* Core Contracts */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">Protect.it Core Contracts</h2>
          
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

        {/* Contract Descriptions */}
        <div className="mt-8 bg-[#00FA9A]/20 border border-[#00FA9A] rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Contract Functions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Factory Contract</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Creates new insurance markets</li>
                <li>• Manages supported protocols</li>
                <li>• Deploys prediction tokens</li>
                <li>• Tracks all markets</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Mock USDC Token</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• ERC-20 trading currency</li>
                <li>• Used for all market transactions</li>
                <li>• Mintable for testing</li>
                <li>• Standard token functions</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-2">Mock Oracle</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Provides market resolution data</li>
                <li>• Reports protocol hack status</li>
                <li>• Triggers market settlements</li>
                <li>• Price feed integration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 