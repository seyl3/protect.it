'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';
import { flowEvmApi, type ContractData } from '../lib/flowEvmApi';

interface ContractInfoProps {
  address: string;
  name?: string;
  description?: string;
  className?: string;
}

export default function ContractInfo({ address, name, description, className = '' }: ContractInfoProps) {
  const [contractInfo, setContractInfo] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContractInfo = useCallback(async () => {
    if (!address) {
      setError('No address provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log(`[ContractInfo] Fetching info for address: ${address}`);
      const info = await flowEvmApi.getContractInfo(address);
      console.log(`[ContractInfo] Received info:`, info);
      setContractInfo(info);
    } catch (error) {
      console.error(`[ContractInfo] Error fetching contract info:`, error);
      setError(error instanceof Error ? error.message : 'Failed to fetch contract info');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchContractInfo();
  }, [fetchContractInfo]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const retryFetch = () => {
    fetchContractInfo();
  };

  if (loading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-900">Error Loading Contract</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={retryFetch}
            className="text-red-600 hover:text-red-800 text-xs underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!contractInfo) {
    return (
          <div className={`bg-[#00FA9A]/20 border border-[#00FA9A] rounded-lg p-4 ${className}`}>
      <h4 className="text-sm font-medium text-[#00FA9A]">No Contract Data</h4>
      <p className="text-xs text-[#00FA9A] mt-1">Unable to load contract information</p>
    </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            {name || (contractInfo.isContract ? 'Smart Contract' : 'Address')}
          </h4>
          {description && (
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            contractInfo.isContract 
              ? 'bg-[#00FA9A]/20 text-[#00FA9A]' 
              : 'bg-[#00FA9A]/20 text-[#00FA9A]'
          }`}>
            {contractInfo.isContract ? '📄 Contract' : '👤 EOA'}
          </span>
        </div>
      </div>

      {/* Contract Details */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Address:</span>
          <div className="flex items-center space-x-1">
            <span className="font-mono text-gray-900">
              {flowEvmApi.formatAddress(address, 12)}
            </span>
            <button
              onClick={copyAddress}
              className="text-gray-400 hover:text-gray-600"
              title="Copy address"
            >
              {copied ? (
                <CheckIcon className="h-4 w-4 text-[#00FA9A]" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Balance:</span>
          <span className="text-gray-900">
            {flowEvmApi.formatBalance(contractInfo.balance)} FLOW
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Transactions:</span>
          <span className="text-gray-900">{contractInfo.nonce}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 border-t border-gray-100">
        <a
          href={flowEvmApi.getExplorerUrl('address', address)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full px-3 py-1.5 text-xs font-medium text-[#00FA9A] bg-[#00FA9A]/20 border border-[#00FA9A] rounded hover:bg-[#00FA9A]/30 transition-colors"
        >
          <ArrowTopRightOnSquareIcon className="h-3 w-3 mr-1" />
          View on Explorer
        </a>
      </div>
    </div>
  );
} 