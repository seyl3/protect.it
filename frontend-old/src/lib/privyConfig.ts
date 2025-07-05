import type { PrivyClientConfig } from '@privy-io/react-auth';
import { flowEVM } from './wallet';

export const privyConfig: PrivyClientConfig = {
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
    showWalletUIs: true,
  },
  loginMethods: ['wallet', 'email', 'sms', 'google', 'github'],
  appearance: {
    showWalletLoginFirst: true,
    theme: 'light',
    accentColor: '#00FA9A', // New theme color
  },
  supportedChains: [flowEVM],
  defaultChain: flowEVM,
}; 