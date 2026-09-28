'use client';

import Link from 'next/link';
import { HeroSealVisual } from '@/components/marketing/hero-seal';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Cpu,
  RefreshCw,
  Layers,
  FileCheck2,
  Terminal,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col flex-1 w-full bg-stone-50 text-stone-900">
      {/* SECTION 1: HERO */}
      <section className="relative overflow-hidden border-b border-stone-200/80 pt-16 pb-20 sm:pt-24 sm:pb-28">
        {/* Full Hero Image positioned at the back of the hero statement with high legibility preservation */}
        <div 
          className="absolute inset-0 -z-10 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div 
            className="absolute inset-0 bg-no-repeat bg-left-center sm:bg-[center_left] bg-cover opacity-[0.12] mix-blend-multiply"
            style={{ backgroundImage: 'url(/hero-seal.jpg)' }}
          />
          {/* Gentle gradient wash ensuring zero obstruction of typography */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-50/92 via-stone-50/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-50/80 via-transparent to-stone-50" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="inline-flex items-center gap-2 self-start rounded-full border border-stone-300 bg-white/80 px-3.5 py-1 text-xs font-mono text-stone-700 shadow-2xs backdrop-blur-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>SERV Mainnet & MCP · Robinhood Chain 4663</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-stone-950 leading-[1.08]">
                Agents can reason about a position.{' '}
                <span className="italic font-serif text-stone-600 block mt-1 sm:inline sm:mt-0">
                  They should not execute against a state that changed underneath them.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-stone-600 leading-relaxed">
                UnitSeal binds every Robinhood Chain Stock Token transfer to the exact economic
                multiplier, price freshness, and trading conditions approved by the human operator.
                If state drifts prior to execution, the onchain guard refuses the transaction.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-full bg-stone-950 px-6 py-3 text-sm font-medium text-stone-50 hover:bg-stone-800 transition-colors shadow-sm"
                >
                  <span>Launch Treasury Console</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/proof"
                  className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-medium text-stone-800 hover:bg-stone-100 transition-colors shadow-2xs"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Inspect Proof & Break Tests</span>
                </Link>
              </div>

              {/* Invariant Micro-Badge */}
              <div className="pt-4 border-t border-stone-200/80">
                <div className="flex items-center gap-3 text-xs font-mono text-stone-500">
                  <span className="text-stone-400 font-semibold uppercase">CORE GUARANTEE:</span>
                  <span>Zero silent executions under stale unit economics (Fail Closed)</span>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="lg:col-span-5 flex justify-center">
              <HeroSealVisual />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THE CONTRADICTION */}
      <section className="border-b border-stone-200/80 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-700">
              The Sponsor Discovery
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-normal text-stone-950">
              Same Raw Token Balance. Radically Different Economic Value.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed">
              On Robinhood Chain, Stock Tokens represent underlying corporate equities. When corporate actions occur (splits, dividends, reverse splits), the raw ERC-20 wallet balance remains identical, while the economic share-per-token relationship changes via <code className="bg-stone-100 px-1 py-0.5 rounded text-sm text-stone-800">uiMultiplier()</code>.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* The Naive Danger */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-800 font-mono text-xs font-semibold uppercase">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>The Dangerous Assumption</span>
                </div>
                <h3 className="mt-3 font-display text-xl font-medium text-stone-950">
                  Naive Agentic Automation
                </h3>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  An autonomous agent queries offchain REST prices, assumes a static 1:1 token-to-share relationship, and prepares a transfer. While awaiting execution or signature, a corporate action updates the multiplier from 1.0 to 0.5.
                </p>
                <div className="mt-6 rounded-lg border border-rose-200 bg-white p-4 font-mono text-xs text-rose-950 space-y-2">
                  <div className="flex justify-between border-b border-rose-100 pb-1">
                    <span>Target Exposure:</span>
                    <span className="font-semibold">$10,000.00</span>
                  </div>
                  <div className="flex justify-between border-b border-rose-100 pb-1">
                    <span>Tokens Transferred:</span>
                    <span>50.0000 AAPL</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Actual Value Delivered:</span>
                    <span>$5,000.00 (-50% ERROR)</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-xs text-rose-700 italic">
                Result: Treasury suffers silent 50% capital distortion.
              </div>
            </div>

            {/* The UnitSeal Mechanism */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-emerald-800 font-mono text-xs font-semibold uppercase">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>The UnitSeal Guarantee</span>
                </div>
                <h3 className="mt-3 font-display text-xl font-medium text-stone-950">
                  Cryptographically Bound State Seal
                </h3>
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">
                  UnitSeal captures a multi-surface snapshot. Offchain reconciliation binds the exact multiplier to an EIP-712 attestation. Immediately prior to onchain transfer, <code className="bg-white px-1 py-0.5 rounded text-stone-800 font-mono text-xs">UnitSealGuard.sol</code> verifies the live <code className="bg-white px-1 py-0.5 rounded text-stone-800 font-mono text-xs">uiMultiplier()</code>.
                </p>
                <div className="mt-6 rounded-lg border border-emerald-200 bg-white p-4 font-mono text-xs text-emerald-950 space-y-2">
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span>Expected Multiplier:</span>
                    <span className="font-semibold">1.000000000000000000</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1">
                    <span>Observed Onchain:</span>
                    <span className="text-amber-700 font-semibold">0.500000000000000000</span>
                  </div>
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>Guard Enforcement:</span>
                    <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">REFUSED · HARD STOP</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 text-xs text-emerald-700">
                Outcome: Capital protected. System prompts operator to recheck and reseal.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: HOW IT WORKS */}
      <section className="border-b border-stone-200/80 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-stone-500">
              Execution Architecture
            </span>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-normal text-stone-950">
              The Two-Boundary State Binding Loop
            </h2>
            <p className="mt-3 text-sm sm:text-base text-stone-600">
              SERV reasons. Deterministic code verifies. The onchain guard enforces the final invariant. The human signs.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'SERV Reasoning',
                desc: 'Interprets high-level treasury intent and extracts canonical operational parameters without approving transactions.',
                tag: 'OpenServ Inference API',
                icon: Cpu,
              },
              {
                step: '02',
                title: 'State Reconciliation',
                desc: 'Queries /assets, /prices, /corporate-actions, and uiMultiplier(). Computes exact raw tokens via fixed-point math.',
                tag: 'Multi-Surface Digest',
                icon: RefreshCw,
              },
              {
                step: '03',
                title: 'UnitSeal Attestation',
                desc: 'Hashes plan and state into a canonical seal. Attestor signs EIP-712 payload certifying offchain preconditions.',
                tag: 'EIP-712 Typed Data',
                icon: Lock,
              },
              {
                step: '04',
                title: 'Onchain Guard Gate',
                desc: 'UnitSealGuard.sol checks attestation, replay nonce, and reads live onchain uiMultiplier() before permitting transfer.',
                tag: 'Robinhood Chain Testnet',
                icon: ShieldCheck,
              },
            ].map((card) => (
              <div
                key={card.step}
                className="relative rounded-xl border border-stone-200 bg-white p-6 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-stone-400">
                      STEP {card.step}
                    </span>
                    <card.icon className="h-4 w-4 text-stone-600" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-medium text-stone-950">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-6 pt-3 border-t border-stone-100">
                  <span className="font-mono text-[10px] text-stone-500 uppercase tracking-wider">
                    {card.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: LIVE PROOF PREVIEW */}
      <section className="border-b border-stone-200/80 bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-5">
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Verifiable Demonstration
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-normal text-stone-950 leading-tight">
                Don't Trust Us. Inspect The Break Campaign.
              </h2>
              <p className="text-base text-stone-600 leading-relaxed">
                UnitSeal includes an interactive adversarial testbed that deliberately injects a corporate action multiplier shift between plan review and transaction submission.
              </p>
              <div className="space-y-3 font-mono text-xs text-stone-700 pt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Happy Path: Multipliers match → Transaction executed on Robinhood Chain</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Break Path: Injected 50% split → UnitSealGuard emits SealRefused</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Recovery Path: Automatic state refresh → Recompiled tokens → Re-executed</span>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/proof"
                  className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-2.5 text-xs font-medium text-stone-50 hover:bg-stone-800 transition-colors shadow-2xs"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Run Live Break Campaign In Browser</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              {/* Terminal Card */}
              <div className="rounded-xl border border-stone-800 bg-stone-950 p-6 text-stone-200 font-mono text-xs shadow-xl">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3 text-stone-500 text-[11px]">
                  <span>UNITSEAL_BREAK_CAMPAIGN.sh</span>
                  <span>NODE: RH_TESTNET_46630</span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="text-stone-400">$ ./unitseal run-adversarial-test --token AAPL</div>
                  <div className="text-emerald-400">✓ Initial state observed: uiMultiplier = 1.0000x</div>
                  <div className="text-emerald-400">✓ Seal generated: 0x9f4a...28b1 (Target: $10,000)</div>
                  <div className="text-amber-400">! Injecting state drift: uiMultiplier -&gt; 0.5000x</div>
                  <div className="text-stone-300">&gt; Submitting execution to UnitSealGuard...</div>
                  <div className="text-rose-400 font-bold">
                    ✖ REVERT: MultiplierMismatch(expected: 1.0e18, actual: 0.5e18)
                  </div>
                  <div className="text-stone-400">
                    &gt; Triggering automatic recovery: re-reading state...
                  </div>
                  <div className="text-emerald-400">
                    ✓ New Seal generated: 0x3d12...c770 (Tokens adjusted: 50 -&gt; 100)
                  </div>
                  <div className="text-emerald-400 font-bold">
                    ✓ TX CONFIRMED: 0x7a89...ef12 on Robinhood Testnet
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5: FOOTER */}
      <footer className="border-t border-stone-200 bg-stone-100/50 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-stone-900">UNITSEAL</span>
            <span className="text-stone-400">·</span>
            <span className="text-xs font-mono text-stone-500">
              Robinhood Chain & SERV Hackathon Edition 01
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-stone-600 font-mono">
            <Link href="/dashboard" className="hover:text-stone-950 transition-colors">
              Console
            </Link>
            <Link href="/plans" className="hover:text-stone-950 transition-colors">
              Plans
            </Link>
            <Link href="/proof" className="hover:text-stone-950 transition-colors">
              Proof
            </Link>
            <a
              href="https://robinhoodchain.blockscout.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-950 transition-colors"
            >
              Blockscout Explorer ↗
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
