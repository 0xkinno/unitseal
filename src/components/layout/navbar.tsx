'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/wallet/context';
import { ShieldCheck, Wallet, ChevronDown, ExternalLink } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { isConnected, address, chainId, isCorrectChain, connect, disconnect, switchChain, isConnecting } = useWallet();

  const navLinks = [
    { href: '/', label: 'Overview' },
    { href: '/dashboard', label: 'Treasury' },
    { href: '/plans', label: 'Plan & Seal' },
    { href: '/seals', label: 'Seals Journal' },
    { href: '/proof', label: 'Proof Lab' },
    { href: '/activity', label: 'Activity' },
  ];

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200/80 bg-stone-50/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-stone-800 bg-stone-900 text-stone-100 shadow-sm transition-transform group-hover:scale-105">
            <span className="font-mono text-xs font-bold tracking-widest">US</span>
            <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-stone-50 animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-lg font-semibold tracking-tight text-stone-900 leading-none">
              UNITSEAL
            </span>
            <span className="font-mono text-[10px] tracking-wider text-stone-500 uppercase">
              State-Bound Execution Guard
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100/70 p-1 shadow-inner">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-stone-900 text-stone-50 shadow-sm'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-200/60'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Network & Wallet Controls */}
        <div className="flex items-center gap-2.5">
          {/* Robinhood Chain Badge */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-mono text-stone-700 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Robinhood 46630</span>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-1.5">
              {!isCorrectChain && (
                <button
                  onClick={switchChain}
                  className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-500/20 transition-colors"
                >
                  Switch Chain
                </button>
              )}
              <div className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-mono text-stone-800 shadow-2xs">
                <span className="text-stone-400">●</span>
                <span>{address ? formatAddress(address) : ''}</span>
                <button
                  onClick={disconnect}
                  title="Disconnect Wallet"
                  className="ml-1 text-stone-400 hover:text-rose-600 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={connect}
              disabled={isConnecting}
              className="flex items-center gap-2 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-medium text-stone-50 hover:bg-stone-800 transition-colors shadow-xs disabled:opacity-50"
            >
              <Wallet className="h-3.5 w-3.5" />
              <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
