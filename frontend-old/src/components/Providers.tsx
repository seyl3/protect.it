'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { wagmiConfig } from '../lib/wallet';
import { privyConfig } from '../lib/privyConfig';
import { useState, useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ConnectWalletButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <button 
        disabled 
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
      >
        Loading...
      </button>
    );
  }

  if (authenticated && user) {
    // Show user info and logout button
    const displayName = user.email?.address || 
                       user.phone?.number || 
                       user.wallet?.address?.slice(0, 6) + '...' + user.wallet?.address?.slice(-4) ||
                       'User';
    
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-black">
          {displayName}
        </span>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={login}
      className="px-4 py-2 bg-[#00FA9A] text-black rounded-lg hover:bg-[#00FA9A]/80 transition text-base font-bold flex items-center gap-2 shadow-lg"
    >
      Connect Wallet
      <img 
        src="/privy.png" 
        alt="Privy" 
        className="w-5 h-5"
      />
    </button>
  );
}

function FlowPopup() {
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-[#00FA9A] text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-[#00FA9A]/90 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 cursor-pointer">
      <span className="text-sm font-bold font-faith">built on flow</span>
      <img 
        src="/flow.svg" 
        alt="Flow" 
        className="w-5 h-5"
      />
    </div>
  );
}

function GlassNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { href: "/markets", label: "Markets" },
    { href: "/create", label: "Create Market" },
    { href: "/contracts", label: "Contracts" }
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-30 transition-all duration-300 backdrop-blur-md bg-white/80 border-b border-white/30 ${
        scrolled ? 'bg-white/95 shadow-lg' : 'bg-white/80'
      }`}
      style={{ WebkitBackdropFilter: 'blur(16px)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="font-faith text-3xl font-extrabold text-black tracking-tight drop-shadow-sm hover:text-[#00FA9A] transition-colors duration-300">
              protect.it
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative text-black hover:text-[#00FA9A] transition-all duration-300 font-medium px-4 py-2 rounded-lg hover:bg-[#00FA9A]/10 group"
              >
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#00FA9A] transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          {/* Desktop Wallet Button */}
          <div className="hidden md:flex items-center">
            <ConnectWalletButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <ConnectWalletButton />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-black hover:text-[#00FA9A] transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/30 bg-white/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-black hover:text-[#00FA9A] hover:bg-[#00FA9A]/10 transition-all duration-300 font-medium px-3 py-2 rounded-lg"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GlassNav />
      <FlowPopup />
      {children}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR issues by not rendering wallet providers until client-side
  if (!mounted) {
  return (
      <QueryClientProvider client={queryClient}>
        <div suppressHydrationWarning>
          {children}
        </div>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider 
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!} 
      config={privyConfig}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <AppContent>{children}</AppContent>
    </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
} 