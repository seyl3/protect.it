// Contract types for better TypeScript support
declare module '@/contracts' {
  export interface ContractReadResult {
    data: unknown;
    error?: Error;
    isLoading: boolean;
  }
}

// Global type extensions for contract calls
declare global {
  interface Window {
    ethereum?: any;
  }
}

export {}; 