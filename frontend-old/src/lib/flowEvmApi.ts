// Flow EVM API service for fetching contract and transaction information

export interface ContractData {
  address: string;
  balance: string;
  nonce: number;
  isContract: boolean;
  deploymentTx?: string;
  deploymentBlock?: number;
  firstSeen?: string;
  lastSeen?: string;
}

export interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: 'success' | 'failed';
  timestamp: number;
}

class FlowEvmApiService {
  private readonly evmRpcUrl = 'https://mainnet.evm.nodes.onflow.org';

  async getContractInfo(address: string): Promise<ContractData> {
    try {
      console.log(`[FlowEvmApi] Fetching contract info for: ${address}`);
      
      // Parallel RPC calls for efficiency
      const [codeResponse, balanceResponse, nonceResponse] = await Promise.all([
        this.rpcCall('eth_getCode', [address, 'latest']),
        this.rpcCall('eth_getBalance', [address, 'latest']),
        this.rpcCall('eth_getTransactionCount', [address, 'latest'])
      ]);

      console.log(`[FlowEvmApi] Raw responses:`, {
        code: codeResponse,
        balance: balanceResponse,
        nonce: nonceResponse
      });

      const isContract = codeResponse.result && codeResponse.result !== '0x';
      const balance = balanceResponse.result || '0x0';
      const nonce = nonceResponse.result || '0x0';

      const contractData: ContractData = {
        address,
        balance: this.hexToDecimal(balance),
        nonce: parseInt(nonce, 16),
        isContract,
      };

      console.log(`[FlowEvmApi] Processed contract data:`, contractData);
      
      return contractData;
    } catch (error) {
      console.error(`[FlowEvmApi] Error fetching contract info for ${address}:`, error);
      
      // Return fallback data instead of throwing
      return {
        address,
        balance: '0',
        nonce: 0,
        isContract: false,
      };
    }
  }

  async getTransactionInfo(hash: string): Promise<TransactionData | null> {
    try {
      console.log(`[FlowEvmApi] Fetching transaction info for: ${hash}`);
      
      const [txResponse, receiptResponse] = await Promise.all([
        this.rpcCall('eth_getTransactionByHash', [hash]),
        this.rpcCall('eth_getTransactionReceipt', [hash])
      ]);

      if (!txResponse.result || !receiptResponse.result) {
        console.log(`[FlowEvmApi] Transaction not found: ${hash}`);
        return null;
      }

      const tx = txResponse.result;
      const receipt = receiptResponse.result;

      const transactionData: TransactionData = {
        hash,
        blockNumber: parseInt(tx.blockNumber, 16),
        from: tx.from,
        to: tx.to || '',
        value: this.hexToDecimal(tx.value),
        gasUsed: this.hexToDecimal(receipt.gasUsed),
        status: receipt.status === '0x1' ? 'success' : 'failed',
        timestamp: Date.now(), // We'd need to fetch block to get real timestamp
      };

      console.log(`[FlowEvmApi] Transaction data:`, transactionData);
      return transactionData;
    } catch (error) {
      console.error(`[FlowEvmApi] Error fetching transaction info for ${hash}:`, error);
      return null;
    }
  }

  private async rpcCall(method: string, params: any[]): Promise<any> {
    const response = await fetch(this.evmRpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC call failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    return data;
  }

  private hexToDecimal(hex: string): string {
    if (!hex || hex === '0x') return '0';
    return parseInt(hex, 16).toString();
  }

  // Helper function to generate explorer URLs
  getExplorerUrl(type: 'address' | 'tx', identifier: string): string {
    return `https://evm.flowscan.io/${type}/${identifier}`;
  }

  // Helper function to format Flow addresses
  formatAddress(address: string, length: number = 8): string {
    if (address.length <= length) return address;
    return `${address.slice(0, length)}...${address.slice(-4)}`;
  }

  // Helper function to format Flow balance
  formatBalance(balance: string, decimals: number = 18): string {
    const balanceBigInt = BigInt(balance);
    const divisor = BigInt(10 ** decimals);
    const wholePart = balanceBigInt / divisor;
    const fractionalPart = balanceBigInt % divisor;
    
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    }
    
    const fractionalString = fractionalPart.toString().padStart(decimals, '0');
    const trimmedFractional = fractionalString.replace(/0+$/, '');
    
    return `${wholePart}.${trimmedFractional}`;
  }
}

// Export singleton instance
export const flowEvmApi = new FlowEvmApiService(); 