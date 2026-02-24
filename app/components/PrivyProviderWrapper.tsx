'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { base } from 'viem/chains';

export default function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['email', 'sms', 'google', 'wallet'],
        appearance: {
          theme: 'light',
          accentColor: '#1a1a1a',
          logo: '/favicon.ico',
          walletList: ['coinbase_wallet', 'metamask'],
        },
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets', // auto-create wallet for email/phone/Google users
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
