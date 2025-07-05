interface TransactionInfoProps {
  hash: string;
  status: 'pending' | 'success' | 'error';
  title: string;
  description: string;
  explorerUrl?: string;
}

export function TransactionInfo({ 
  hash, 
  status, 
  title, 
  description, 
  explorerUrl = 'https://evm.flowscan.io' 
}: TransactionInfoProps) {
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
    <div className={`mb-8 bg-${color}-50 border border-${color}-200 rounded-md p-4`}>
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
                  href={`${explorerUrl}/tx/${hash}`}
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
                  href={`${explorerUrl}/tx/${hash}`}
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