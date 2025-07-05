'use client';

import React, { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { FACTORY_ADDRESS } from '../lib/wallet';
import factoryAbi from '../abi/PredictionMarketFactory.json';

export default function CreateMarketForm() {
  const [protocol, setProtocol] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionError, setTransactionError] = useState<Error | null>(null);

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

  // Handle transaction states
  useEffect(() => {
    if (isConfirmed) {
      setIsSubmitting(false);
      setTransactionError(null);
    } else if (confirmError) {
      setTransactionError(confirmError instanceof Error ? confirmError : new Error(String(confirmError)));
      setIsSubmitting(false);
    }
  }, [isConfirmed, confirmError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocol || !duration) return;

    setIsSubmitting(true);
    setTransactionError(null);
    
    try {
      console.log('Creating market with:', { protocol, duration });
      console.log('Factory address:', FACTORY_ADDRESS);
      
      await writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi.abi,
        functionName: 'deployMarket',
        args: [protocol, duration],
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

  // Show any transaction errors (either from write or confirmation)
  const error = transactionError || writeError || confirmError;

  // Convert BigInt durations to numbers for display
  const durationOptions = supportedDurations 
    ? (supportedDurations as bigint[]).map(d => ({
        value: Number(d),
        label: `${Number(d)} days`
      }))
    : [
        { value: 30, label: '30 days' },
        { value: 90, label: '90 days' },
        { value: 180, label: '180 days' },
        { value: 365, label: '365 days' },
      ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Create Insurance Market</h1>
          <p className="mt-4 text-lg text-gray-600">
            Deploy a new prediction market for DeFi protocol insurance
          </p>
        </div>

        {isConfirmed && hash && (
          <div className="mb-8 bg-[#00FA9A]/20 border border-[#00FA9A] rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-[#00FA9A]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-[#00FA9A]">Market Created Successfully!</h3>
                <div className="mt-2 text-sm text-[#00FA9A]">
                  <p>Your insurance market has been deployed on Flow EVM.</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center">
                      <span className="font-medium">Transaction Hash:</span>
                      <a
                        href={`https://evm.flowscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#00FA9A] hover:text-[#00FA9A]/80 font-mono text-xs break-all"
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
                        className="ml-2 text-[#00FA9A] hover:text-[#00FA9A]/80"
                      >
                        View on Flow EVM Explorer →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error Creating Market</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error instanceof Error ? error.message : String(error)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {(isPending || isConfirming) && (
          <div className="mb-8 bg-[#00FA9A]/20 border border-[#00FA9A] rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-[#00FA9A]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-[#00FA9A]">
                  {isPending ? 'Transaction Pending' : 'Confirming Transaction'}
                </h3>
                <div className="mt-2 text-sm text-[#00FA9A]">
                  <p>
                    {isPending 
                      ? 'Please confirm the transaction in your wallet...'
                      : 'Please wait while your transaction is being confirmed on Flow EVM...'}
                  </p>
                  {hash && (
                    <div className="mt-2">
                      <span className="font-medium">Transaction Hash:</span>
                      <a
                        href={`https://evm.flowscan.io/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-[#00FA9A] hover:text-[#00FA9A]/80 font-mono text-xs break-all"
                      >
                        {hash}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <div className="md:grid md:grid-cols-3 md:gap-6">
              <div className="md:col-span-1">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Market Configuration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure the parameters for your insurance market
                </p>
              </div>
              <div className="mt-5 md:mt-0 md:col-span-2">
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6 sm:col-span-4">
                    <label htmlFor="protocol" className="block text-sm font-medium text-gray-700">
                      Protocol
                    </label>
                    <select
                      id="protocol"
                      name="protocol"
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#00FA9A] focus:border-[#00FA9A] sm:text-sm"
                      required
                    >
                      <option value="">Select a protocol</option>
                      {supportedProtocols && Array.isArray(supportedProtocols) && 
                        (supportedProtocols as string[]).map((protocolName: string) => (
                          <option key={protocolName} value={protocolName}>
                            {protocolName}
                          </option>
                        ))
                      }
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Protocols loaded from smart contract
                    </p>
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                      Duration
                    </label>
                    <select
                      id="duration"
                      name="duration"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#00FA9A] focus:border-[#00FA9A] sm:text-sm"
                      required
                    >
                      {durationOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">How it Works</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-[#00FA9A]/20 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[#00FA9A]">YES Tokens (Insurance)</h4>
                <p className="mt-1 text-sm text-[#00FA9A]">
                  Buy YES tokens to insure against protocol hacks. If the protocol gets hacked, you receive payouts.
                </p>
              </div>
              <div className="bg-[#00FA9A]/20 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-[#00FA9A]">NO Tokens (Betting)</h4>
                <p className="mt-1 text-sm text-[#00FA9A]">
                  Buy NO tokens to bet against hacks. If the protocol remains secure, you earn returns.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Market Details</h3>
            {protocol && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Protocol:</span>
                  <span className="text-sm text-gray-900">{protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Duration:</span>
                  <span className="text-sm text-gray-900">{duration} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">YES Token Name:</span>
                  <span className="text-sm text-gray-900 font-mono">YEShack-{duration}d-{protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">NO Token Name:</span>
                  <span className="text-sm text-gray-900 font-mono">NOhack-{duration}d-{protocol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Network:</span>
                  <span className="text-sm text-gray-900">Flow EVM Mainnet</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!protocol || isSubmitting || isPending || isConfirming}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-black bg-[#00FA9A] hover:bg-[#00FA9A]/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00FA9A] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || isPending || isConfirming ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isConfirming ? 'Confirming...' : 'Creating...'}
                </>
              ) : (
                'Create Market'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 