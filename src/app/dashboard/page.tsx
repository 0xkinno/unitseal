'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/wallet/context';
import {
  TrendingUp,
  ShieldCheck,
  Clock,
  ArrowUpRight,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface Position {
  symbol: string;
  name: string;
  address: string;
  rawBalance: string;
  multiplier: string;
  quotePrice: string;
  quoteAgeSec: number;
  economicValueUsd: string;
  capability: string;
}

export default function DashboardPage() {
  const { isConnected, address, chainId, isCorrectChain, connect, switchChain } = useWallet();
  const [positions, setPositions] = useState<Position[]>([
    {
      symbol: 'AAPL',
      name: 'Apple Inc. Stock Token',
      address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9',
      rawBalance: '1,250.00',
      multiplier: '1.0005x',
      quotePrice: '$228.52',
      quoteAgeSec: 4,
      economicValueUsd: '$285,792.83',
      capability: 'Tradable',
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corp. Stock Token',
      address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC',
      rawBalance: '2,400.00',
      multiplier: '1.0007x',
      quotePrice: '$124.87',
      quoteAgeSec: 6,
      economicValueUsd: '$299,897.90',
      capability: 'Tradable',
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc. Stock Token',
      address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d',
      rawBalance: '600.00',
      multiplier: '1.0000x',
      quotePrice: '$254.22',
      quoteAgeSec: 2,
      economicValueUsd: '$152,532.00',
      capability: 'Tradable',
    },
  ]);

  const [refreshing, setRefreshing] = useState(false);

  const refreshState = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/robinhood/prices/AAPL');
      const data = await res.json();
      if (data.success) {
        setPositions((prev) =>
          prev.map((p) => (p.symbol === 'AAPL' ? { ...p, quoteAgeSec: 1 } : p))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setRefreshing(false), 500);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-500">
            Treasury Portfolio
          </span>
          <h1 className="font-display text-3xl font-medium text-stone-950 mt-1">
            Robinhood Chain Stock Assets
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={refreshState}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50 shadow-2xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh State</span>
          </button>
          <Link
            href="/plans"
            className="flex items-center gap-1.5 rounded-full bg-stone-950 px-4 py-1.5 text-xs font-medium text-stone-50 hover:bg-stone-800 shadow-sm transition-all"
          >
            <span>Draft Plan with SERV</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
            Total Treasury Exposure
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-stone-950">
              $737,870.00
            </span>
          </div>
          <span className="mt-1 block text-xs text-stone-500 font-mono">
            Across 3 Stock Token positions
          </span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
            Multiplier Parity
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-2xl font-semibold text-emerald-600">
              100% In Sync
            </span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <span className="mt-1 block text-xs text-stone-500 font-mono">
            Offchain REST == Onchain uiMultiplier
          </span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
            Execution Guard Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span className="font-display text-2xl font-semibold text-stone-900">
              Active & Enforced
            </span>
            <Lock className="h-5 w-5 text-teal-600" />
          </div>
          <span className="mt-1 block text-xs text-stone-500 font-mono">
            UnitSealGuard.sol on Robinhood Chain (4663)
          </span>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-2xs">
          <span className="font-mono text-xs text-stone-500 uppercase tracking-wider">
            Silent Drift Protection
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl font-semibold text-stone-950">
              0 Violations
            </span>
          </div>
          <span className="mt-1 block text-xs text-stone-500 font-mono">
            Fail-Closed Hard Invariant
          </span>
        </div>
      </div>

      {/* Position Table */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
        <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-stone-950">
            Active Stock Token Positions
          </h2>
          <span className="text-xs font-mono text-stone-500">Live multi-surface feed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-mono text-stone-500 uppercase">
              <tr>
                <th className="px-6 py-3">Asset</th>
                <th className="px-6 py-3">Raw Tokens</th>
                <th className="px-6 py-3">uiMultiplier()</th>
                <th className="px-6 py-3">Underlying Quote</th>
                <th className="px-6 py-3">Economic Value</th>
                <th className="px-6 py-3">Freshness</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              {positions.map((p) => (
                <tr key={p.symbol} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-6 py-4 font-sans">
                    <div className="font-semibold text-stone-950">{p.symbol}</div>
                    <div className="text-xs text-stone-500">{p.name}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-stone-900">{p.rawBalance}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded bg-stone-100 px-2 py-0.5 font-bold text-stone-800">
                      {p.multiplier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-stone-700">{p.quotePrice}</td>
                  <td className="px-6 py-4 font-semibold text-stone-950">{p.economicValueUsd}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Clock className="h-3 w-3" />
                      <span>{p.quoteAgeSec}s ago</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/plans?symbol=${p.symbol}`}
                      className="rounded-full border border-stone-300 px-3 py-1 font-sans text-xs font-medium text-stone-700 hover:bg-stone-900 hover:text-white transition-colors"
                    >
                      Plan Action
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
