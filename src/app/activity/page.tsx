'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Cpu,
  FileSignature,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface AuditEvent {
  id: string;
  type: 'SERV_REASON' | 'SEAL_BOUND' | 'EXECUTION' | 'REFUSAL';
  title: string;
  description: string;
  symbol: string;
  targetValue: string;
  time: string;
  hash: string;
}

export default function ActivityPage() {
  const [events] = useState<AuditEvent[]>([
    {
      id: 'evt-01',
      type: 'EXECUTION',
      title: 'Transfer Executed Onchain',
      description: 'UnitSealGuard confirmed valid state seal and executed 21.8817 AAPL transfer to reserve.',
      symbol: 'AAPL',
      targetValue: '$5,000.00',
      time: '4 mins ago',
      hash: '0x7b4a98f1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      id: 'evt-02',
      type: 'SEAL_BOUND',
      title: 'UnitSeal Generated & Attested',
      description: 'EIP-712 typed attestation signed by 0xe98A...4E7f. Multiplier sealed at 1.0005x.',
      symbol: 'AAPL',
      targetValue: '$5,000.00',
      time: '5 mins ago',
      hash: '0x9f4a7c182b81093d5678129034aabbcc11223344556677889900aabbccddeeff',
    },
    {
      id: 'evt-03',
      type: 'SERV_REASON',
      title: 'SERV Reasoning Completed',
      description: 'serv-standard parsed user directive: "Rebalance portfolio: Transfer $5,000 of AAPL..."',
      symbol: 'AAPL',
      targetValue: '$5,000.00',
      time: '6 mins ago',
      hash: 'msg_011CfWENUjC8tDWa4HwzF87W',
    },
    {
      id: 'evt-04',
      type: 'REFUSAL',
      title: 'Execution Refused: Multiplier Drift Injected',
      description: 'Onchain guard detected multiplier mismatch (expected 1.0x vs current 0.5x). Fail-closed halt enforced.',
      symbol: 'AAPL',
      targetValue: '$10,000.00',
      time: '24 mins ago',
      hash: '0x3d12aa56bc9012344567890abcdef1234567890abcdef1234567890abcdef1234',
    },
    {
      id: 'evt-05',
      type: 'EXECUTION',
      title: 'Portfolio Rebalance Executed',
      description: 'Allocated 80.0832 NVDA Stock Tokens to cold treasury after verifying 1.0000x multiplier.',
      symbol: 'NVDA',
      targetValue: '$10,000.00',
      time: '1 hour ago',
      hash: '0x11223344556677889900aabbccddeeff0011223344556677889900aabbccddeeff',
    },
  ]);

  const getIcon = (type: AuditEvent['type']) => {
    switch (type) {
      case 'EXECUTION':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'REFUSAL':
        return <XCircle className="h-4 w-4 text-rose-600" />;
      case 'SEAL_BOUND':
        return <ShieldCheck className="h-4 w-4 text-teal-600" />;
      case 'SERV_REASON':
        return <Cpu className="h-4 w-4 text-stone-700" />;
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-500">
          Telemetry & Governance
        </span>
        <h1 className="font-display text-3xl font-medium text-stone-950 mt-1">
          Activity & Invariant Audit Trail
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Continuous record of intent parsing, state snapshots, seal generation, human approvals,
          and execution events.
        </p>
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-stone-200 bg-white shadow-2xs divide-y divide-stone-100">
        {events.map((evt) => (
          <div key={evt.id} className="p-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-stone-50/50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 rounded-full border border-stone-200 bg-stone-50 p-2 shrink-0">
                {getIcon(evt.type)}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display text-base font-medium text-stone-950">
                    {evt.title}
                  </h3>
                  <span className="font-mono text-xs font-semibold text-stone-600 rounded bg-stone-100 px-2 py-0.5">
                    {evt.symbol}
                  </span>
                </div>
                <p className="text-sm text-stone-600 leading-relaxed font-sans max-w-2xl">
                  {evt.description}
                </p>
                <div className="font-mono text-[11px] text-stone-400 truncate max-w-md pt-1">
                  ID: {evt.hash}
                </div>
              </div>
            </div>

            <div className="sm:text-right shrink-0 font-mono text-xs">
              <span className="font-semibold text-stone-900 block">{evt.targetValue}</span>
              <span className="text-stone-400 flex items-center sm:justify-end gap-1 mt-1">
                <Clock className="h-3 w-3" />
                <span>{evt.time}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
