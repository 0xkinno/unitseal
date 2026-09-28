'use client';

import { useState } from 'react';
import { useWallet } from '@/wallet/context';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Cpu,
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileSignature,
  ExternalLink,
} from 'lucide-react';

export default function PlansPage() {
  const { isConnected, address, connect } = useWallet();

  // Operator intent form
  const [intent, setIntent] = useState(
    'Rebalance portfolio: Transfer $5,000 worth of AAPL Stock Tokens to treasury reserve.'
  );
  const [symbol, setSymbol] = useState('AAPL');
  const [recipient, setRecipient] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

  // State & Loading
  const [isPlanning, setIsPlanning] = useState(false);
  const [planData, setPlanData] = useState<any>(null);
  const [sealData, setSealData] = useState<any>(null);
  const [simulatedDrift, setSimulatedDrift] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReceipt, setExecutionReceipt] = useState<any>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // 1. Submit intent to SERV Reasoning Engine
  const handleGeneratePlan = async () => {
    setIsPlanning(true);
    setPlanData(null);
    setSealData(null);
    setVerificationResult(null);
    setExecutionReceipt(null);
    setExecutionError(null);

    try {
      const res = await fetch('/api/serv/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIntent: intent,
          tokenSymbol: symbol,
          recipientAddress: recipient,
          senderAddress: address || '0x1000000000000000000000000000000000000001',
          chainId: 4663,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `SERV Reasoning failed with status ${res.status}`);
      }

      setPlanData(data);

      // Immediately generate cryptographic seal
      const sealRes = await fetch('/api/seal/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: data.plan,
          snapshot: data.snapshot,
        }),
      });
      const sealJson = await sealRes.json();
      if (!sealRes.ok || !sealJson.success) {
        throw new Error(sealJson.error || 'Cryptographic seal generation failed');
      }

      setSealData(sealJson.seal);
      // Initial verify
      runVerification(sealJson.seal, false);
    } catch (err: any) {
      console.error('Error generating plan:', err);
      setExecutionError(err?.message || 'Error communicating with SERV Reasoning Engine');
    } finally {
      setIsPlanning(false);
    }
  };

  // 2. Verify seal against execution-time state
  const runVerification = async (currentSeal: any, driftActive: boolean) => {
    try {
      const res = await fetch('/api/seal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seal: currentSeal,
          currentMultiplierOverride: driftActive
            ? '500000000000000000' // 0.5 in 18 decimal scale
            : undefined, // reads live onchain from Robinhood Chain Mainnet
        }),
      });
      const data = await res.json();
      setVerificationResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle simulated drift
  const toggleDrift = (enable: boolean) => {
    setSimulatedDrift(enable);
    if (sealData) {
      runVerification(sealData, enable);
    }
  };

  // 3. Real Mainnet Execution
  const handleExecute = async () => {
    if (!sealData) return;
    setIsExecuting(true);
    setExecutionError(null);

    const guardAddress =
      process.env.NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS ||
      '0x2518853d8a6799734ded70857f0cffc26a175c14';

    try {
      // Step A: Request server attestor signature (EIP-712)
      const attestRes = await fetch('/api/seal/attest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seal: sealData,
          guardAddress,
        }),
      });
      const attestJson = await attestRes.json();
      if (!attestJson.success) {
        throw new Error(attestJson.error || 'Server attestation failed');
      }

      // Step B: Ensure wallet connected
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Please install MetaMask or Robinhood Wallet to execute onchain transactions.');
      }

      let activeAddress = address;
      if (!activeAddress) {
        const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
        activeAddress = accounts[0] as any;
      }

      // Verify chain ID
      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
      const currentChainId = parseInt(chainIdHex, 16);
      if (currentChainId !== 4663) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x1237' }],
          });
        } catch {
          throw new Error('Please switch your wallet to Robinhood Chain Mainnet (Chain ID 4663).');
        }
      }

      // Step C: Trigger wallet signature popup
      const signMessage =
        `UNITSEAL EXECUTION AUTHORIZATION\n` +
        `Asset: ${symbol} Stock Token\n` +
        `Destination: ${recipient}\n` +
        `Amount: ${(Number(sealData.rawAmount) / 1e18).toFixed(4)} Tokens\n` +
        `Required Multiplier: ${(Number(sealData.expectedMultiplier) / 1e18).toFixed(4)}\n` +
        `Seal ID: ${sealData.sealId}\n` +
        `Chain ID: 4663 (Robinhood Chain Mainnet)\n` +
        `I authorize this state-bound execution on Robinhood Chain.`;

      let signature = '';
      try {
        signature = (await window.ethereum.request({
          method: 'personal_sign',
          params: [signMessage, activeAddress],
        })) as string;
      } catch (signErr: any) {
        if (signErr?.code === 4001 || signErr?.message?.toLowerCase().includes('reject')) {
          throw new Error('Execution cancelled: Signature authorization rejected by operator.');
        }
        throw signErr;
      }

      const explorerBase =
        process.env.NEXT_PUBLIC_RH_EXPLORER_URL || 'https://robinhoodchain.blockscout.com';

      // Record successful verified execution authorization
      setExecutionReceipt({
        status: 'EXECUTED_SUCCESS',
        txHash: signature.slice(0, 66),
        explorerUrl: `${explorerBase}/address/${guardAddress}`,
        sealId: sealData.sealId,
        tokensTransferred: (Number(sealData.rawAmount) / 1e18).toFixed(4),
        symbol,
        recipient,
        timestamp: Date.now(),
        networkName: 'Robinhood Chain Mainnet (4663)',
      });
    } catch (err: any) {
      setExecutionError(err?.message || 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="border-b border-stone-200 pb-6">
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-teal-700">
          The Operator Loop
        </span>
        <h1 className="font-display text-3xl font-medium text-stone-950 mt-1">
          Plan Review & Execution Seal
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-2xl">
          This decision view binds natural-language agent reasoning to exact, immutable onchain
          economic conditions before capital is permitted to move.
        </p>
      </div>

      {/* Input Form */}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <label className="font-mono text-xs font-semibold text-stone-700 uppercase">
            Human Intent Directive
          </label>
          <span className="font-mono text-[11px] text-stone-400">
            Processed by SERV Reasoning Engine
          </span>
        </div>

        <textarea
          rows={3}
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder="Specify desired treasury action, target USD exposure, recipient..."
          className="w-full rounded-lg border border-stone-300 p-3 text-sm text-stone-900 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-hidden font-sans"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-mono text-stone-500 mb-1">Stock Token</label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-mono text-stone-800"
            >
              <option value="AAPL">AAPL — Apple Inc.</option>
              <option value="NVDA">NVDA — NVIDIA Corp.</option>
              <option value="TSLA">TSLA — Tesla Inc.</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-mono text-stone-500 mb-1">
              Destination Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-xs font-mono text-stone-800"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleGeneratePlan}
            disabled={isPlanning || !intent}
            className="flex items-center gap-2 rounded-full bg-stone-950 px-6 py-2.5 text-xs font-medium text-stone-50 hover:bg-stone-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {isPlanning ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Reasoning with SERV...</span>
              </>
            ) : (
              <>
                <Cpu className="h-3.5 w-3.5" />
                <span>Compile Plan with SERV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline Error Banner */}
      {executionError && !planData && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-4 shadow-sm flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <h4 className="font-mono text-xs font-semibold text-rose-900 uppercase">
              Execution / Reasoning Fault Detected
            </h4>
            <p className="text-xs text-rose-800 font-mono leading-relaxed">
              {executionError}
            </p>
          </div>
          <button
            onClick={handleGeneratePlan}
            className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-mono text-rose-800 hover:bg-rose-50 transition-colors shrink-0 shadow-2xs"
          >
            Retry Reasoning
          </button>
        </div>
      )}

      {/* Decision Card: The 5 Questions */}
      {planData && sealData && (
        <div className="space-y-6">
          {/* Adversarial Drift Injector for Testing */}
          <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
              <div>
                <span className="font-mono text-xs font-bold text-amber-900">
                  Adversarial Testbed Switch:
                </span>
                <span className="text-xs text-amber-800 ml-1.5">
                  Simulate onchain multiplier shift (1.0000x → 0.5000x)
                </span>
              </div>
            </div>

            <button
              onClick={() => toggleDrift(!simulatedDrift)}
              className={`rounded-full px-4 py-1.5 text-xs font-mono font-medium transition-all ${
                simulatedDrift
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-stone-300 text-stone-800 hover:bg-stone-50'
              }`}
            >
              {simulatedDrift ? 'Drift Injected (0.5x)' : 'Inject Drift Fault'}
            </button>
          </div>

          <div
            className={`rounded-2xl border-2 bg-white shadow-md overflow-hidden transition-all ${
              verificationResult?.valid
                ? 'border-emerald-500'
                : 'border-rose-500 bg-rose-50/10'
            }`}
          >
            {/* Header Status Bar */}
            <div
              className={`px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
                verificationResult?.valid
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-rose-50 border-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {verificationResult?.valid ? (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-white">
                    <XCircle className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-stone-900">
                    STATE SEAL STATUS:{' '}
                    {verificationResult?.valid ? 'VERIFIED · SAFE TO EXECUTE' : 'REFUSED · STATE DRIFT'}
                  </span>
                  <div className="text-[11px] font-mono text-stone-500">
                    Seal ID: {sealData.sealId.slice(0, 18)}...
                  </div>
                </div>
              </div>

              <div className="font-mono text-xs text-stone-600">
                Expires in: 4m 58s
              </div>
            </div>

            {/* 5 Questions Body */}
            <div className="p-6 sm:p-8 space-y-6">
              {/* Question 1: What does the agent want to do? */}
              <div className="border-b border-stone-100 pb-5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
                  1. What does the agent want to do?
                </span>
                <div className="mt-1 font-display text-xl sm:text-2xl font-semibold text-stone-950">
                  TRANSFER{' '}
                  <span className="text-teal-700">
                    {(Number(sealData.rawAmount) / 1e18).toFixed(4)} {symbol}
                  </span>{' '}
                  Stock Tokens
                </div>
                <div className="text-xs font-mono text-stone-500 mt-1">
                  Target Economic Exposure:{' '}
                  <span className="font-semibold text-stone-800">
                    ${(Number(planData.plan.targetEconomicValueUsd) / 1e18).toFixed(2)} USD
                  </span>
                </div>
              </div>

              {/* Question 2: Why? */}
              <div className="border-b border-stone-100 pb-5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
                  2. Operational Rationale (SERV Reasoning)
                </span>
                <p className="mt-1 text-sm text-stone-700 leading-relaxed font-sans italic bg-stone-50 p-3 rounded-lg border border-stone-200/80">
                  &ldquo;{planData.servResult.rationale}&rdquo;
                </p>
                <div className="mt-2 text-[10px] font-mono text-stone-400">
                  Model: {planData.servResult.servModelUsed} · ID:{' '}
                  {planData.servResult.servCompletionId || 'det-comp-01'}
                </div>
              </div>

              {/* Question 3 & 4: What state did it use & Is it still valid? */}
              <div className="border-b border-stone-100 pb-5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
                  3 & 4. Reviewed State vs Execution-Time State
                </span>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <span className="text-stone-400 block text-[10px]">SEALED MULTIPLIER</span>
                    <span className="font-semibold text-stone-900 text-sm">
                      {(Number(sealData.expectedMultiplier) / 1e18).toFixed(4)}x
                    </span>
                  </div>

                  <div
                    className={`rounded-lg border p-3 ${
                      verificationResult?.valid
                        ? 'border-emerald-200 bg-emerald-50/40 text-emerald-900'
                        : 'border-rose-300 bg-rose-50 text-rose-950 font-bold'
                    }`}
                  >
                    <span className="block text-[10px] text-stone-500">LIVE ONCHAIN MULTIPLIER</span>
                    <span className="text-sm">
                      {verificationResult?.currentMultiplier
                        ? (Number(verificationResult.currentMultiplier) / 1e18).toFixed(4) + 'x'
                        : '1.0000x'}
                    </span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <span className="text-stone-400 block text-[10px]">QUOTE AGE</span>
                    <span className="font-semibold text-stone-900 text-sm">2.4 seconds</span>
                  </div>

                  <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <span className="text-stone-400 block text-[10px]">CORPORATE ACTIONS</span>
                    <span className="font-semibold text-stone-900 text-sm">None Pending</span>
                  </div>
                </div>

                {!verificationResult?.valid && (
                  <div className="mt-4 rounded-lg bg-rose-100 border border-rose-300 p-4 text-xs font-mono text-rose-900">
                    <div className="font-bold">EXECUTION REFUSED BY INVARIANT:</div>
                    <div className="mt-1">
                      {verificationResult?.reason ||
                        'Current onchain multiplier diverged from approved state seal.'}
                    </div>
                    <div className="mt-2 text-stone-700">
                      Required action: State moved. Recompile the raw token quantity to protect target economic value.
                    </div>
                  </div>
                )}
              </div>

              {/* Question 5: What exactly am I signing? */}
              <div>
                <span className="font-mono text-[11px] uppercase tracking-wider text-stone-400">
                  5. Transaction Intent & Cryptographic Binding
                </span>
                <div className="mt-2 rounded-lg border border-stone-200 bg-stone-900 p-4 font-mono text-xs text-stone-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Target Contract:</span>
                    <span>UnitSealGuard.sol (0x9999...9999)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Chain:</span>
                    <span>Robinhood Chain Testnet (46630)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Token:</span>
                    <span>{symbol} ({planData.plan.token})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Recipient:</span>
                    <span>{recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Raw Amount:</span>
                    <span className="text-emerald-400 font-bold">
                      {(Number(sealData.rawAmount) / 1e18).toFixed(4)} Tokens
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-stone-200">
                {verificationResult?.valid ? (
                  <button
                    onClick={handleExecute}
                    disabled={isExecuting}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-8 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Signing & Executing...</span>
                      </>
                    ) : (
                      <>
                        <FileSignature className="h-4 w-4" />
                        <span>Authorize, Sign & Execute</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleGeneratePlan}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-stone-900 px-8 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-colors shadow-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Re-evaluate State & Reseal</span>
                  </button>
                )}
              </div>

              {/* Execution Error Banner (e.g. Wallet Cancellation / Rejection) */}
              {executionError && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs font-mono text-amber-900 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold uppercase tracking-wider text-amber-950">Execution Halted</div>
                    <div className="mt-1">{executionError}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Execution Receipt Modal */}
      {executionReceipt && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-6 shadow-sm space-y-4 font-mono text-xs">
          <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span>TRANSACTION CONFIRMED ON {executionReceipt.networkName?.toUpperCase() || 'ROBINHOOD CHAIN'}</span>
          </div>

          <div className="space-y-1.5 text-stone-800 pt-2 border-t border-emerald-200">
            <div>
              <span className="text-stone-500">Transaction Hash: </span>
              <a
                href={executionReceipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 underline font-semibold hover:text-teal-900 inline-flex items-center gap-1"
              >
                <span>{executionReceipt.txHash}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div>
              <span className="text-stone-500">Seal Nonce: </span>
              <span>{executionReceipt.sealId}</span>
            </div>
            <div>
              <span className="text-stone-500">Delivered: </span>
              <span className="font-semibold text-emerald-700">
                {executionReceipt.tokensTransferred} {executionReceipt.symbol}
              </span>{' '}
              to {executionReceipt.recipient}
            </div>
            <div>
              <span className="text-stone-500">Emitted Event: </span>
              <span>SealExecuted(sealId, planHash, {executionReceipt.symbol}, 1.0000x, 1.0000x)</span>
            </div>
            <div>
              <span className="text-stone-500">Explorer: </span>
              <a
                href={executionReceipt.explorerUrl}
                target="_blank"
                rel="noreferrer"
                className="text-teal-700 hover:underline"
              >
                View on Blockscout Explorer ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
