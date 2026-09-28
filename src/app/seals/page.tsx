'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, XCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';

interface SealRecord {
  id: string;
  sealId: string;
  symbol: string;
  rawAmount: string;
  expectedMultiplier: string;
  targetUsd: string;
  recipient: string;
  status: 'EXECUTED' | 'SEALED' | 'REFUSED' | 'EXPIRED';
  observedAt: string;
  txHash?: string;
}

export default function SealsJournalPage() {
  const [filter, setFilter] = useState<string>('ALL');

  const [seals] = useState<SealRecord[]>([
    {
      id: '1',
      sealId: '0x9f4a7c182b81093d5678129034aabbcc11223344556677889900aabbccddeeff',
      symbol: 'AAPL',
      rawAmount: '21.8817',
      expectedMultiplier: '1.0000x',
      targetUsd: '$5,000.00',
      recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      status: 'EXECUTED',
      observedAt: '2 mins ago',
      txHash: '0x7b4a98f1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      id: '2',
      sealId: '0x3d12aa56bc9012344567890abcdef1234567890abcdef1234567890abcdef1234',
      symbol: 'AAPL',
      rawAmount: '43.7634',
      expectedMultiplier: '0.5000x',
      targetUsd: '$5,000.00',
      recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      status: 'REFUSED',
      observedAt: '12 mins ago',
    },
    {
      id: '3',
      sealId: '0x10bb774433221199887766554433221100aabbccddeeff001122334455667788',
      symbol: 'NVDA',
      rawAmount: '80.0832',
      expectedMultiplier: '1.0000x',
      targetUsd: '$10,000.00',
      recipient: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      status: 'SEALED',
      observedAt: 'Just now',
    },
  ]);

  const filteredSeals = seals.filter((s) => (filter === 'ALL' ? true : s.status === filter));

  const getStatusBadge = (status: SealRecord['status']) => {
    switch (status) {
      case 'EXECUTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>EXECUTED</span>
          </span>
        );
      case 'REFUSED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-mono font-medium text-rose-700 border border-rose-200">
            <XCircle className="h-3 w-3" />
            <span>REFUSED (DRIFT)</span>
          </span>
        );
      case 'SEALED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-mono font-medium text-teal-700 border border-teal-200">
            <ShieldCheck className="h-3 w-3" />
            <span>SEALED (VALID)</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-mono font-medium text-stone-600 border border-stone-200">
            <Clock className="h-3 w-3" />
            <span>EXPIRED</span>
          </span>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-500">
            Audit Journal
          </span>
          <h1 className="font-display text-3xl font-medium text-stone-950 mt-1">
            UnitSeals Ledger
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Immutable registry of cryptographic state seals, attested conditions, and onchain outcomes.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 p-1 font-mono text-xs">
          {['ALL', 'SEALED', 'EXECUTED', 'REFUSED'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 transition-all ${
                filter === f ? 'bg-stone-900 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-mono text-stone-500 uppercase">
              <tr>
                <th className="px-6 py-3.5">Seal ID</th>
                <th className="px-6 py-3.5">Asset & Amount</th>
                <th className="px-6 py-3.5">Expected Multiplier</th>
                <th className="px-6 py-3.5">Target Value</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5 text-right">Proof / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              {filteredSeals.map((seal) => (
                <tr key={seal.id} className="hover:bg-stone-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-stone-900">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[140px]">{seal.sealId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-sans font-medium text-stone-950">
                    {seal.rawAmount} {seal.symbol}
                  </td>
                  <td className="px-6 py-4 font-semibold text-stone-800">{seal.expectedMultiplier}</td>
                  <td className="px-6 py-4 font-semibold text-stone-900">{seal.targetUsd}</td>
                  <td className="px-6 py-4">{getStatusBadge(seal.status)}</td>
                  <td className="px-6 py-4 text-stone-500 font-sans">{seal.observedAt}</td>
                  <td className="px-6 py-4 text-right">
                    {seal.txHash ? (
                      <a
                        href={`https://robinhoodchain.blockscout.com/tx/${seal.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-3 py-1 font-sans text-xs text-teal-700 hover:bg-stone-50"
                      >
                        <span>Blockscout</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : seal.status === 'REFUSED' ? (
                      <Link
                        href="/plans"
                        className="inline-flex items-center gap-1 rounded-full bg-stone-900 px-3 py-1 font-sans text-xs text-white hover:bg-stone-800"
                      >
                        Reseal Plan
                      </Link>
                    ) : (
                      <Link
                        href="/plans"
                        className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-3 py-1 font-sans text-xs text-stone-700 hover:bg-stone-100"
                      >
                        Execute
                      </Link>
                    )}
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
