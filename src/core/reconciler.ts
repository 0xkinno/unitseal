import type { Address, UnitStateSnapshot, Hash } from './types';
import { hashUnitState } from './hashing';

// Canonicalize external data into consistent internal format
export interface RawAssetResponse {
  assetUid: string;
  tokenSymbol: string;
  tokenAddress: Address;
  chainId: number;
  currentMultiplier: string;
  pendingMultiplier?: string;
  pendingMultiplierEffectiveTime?: number;
  deployment: {
    chainId: number;
    tokenAddress: Address;
  };
  tradingCapability: {
    market: string | null;
    extended: string | null;
    overnight: string | null;
    fractional: string | null;
  };
}

export interface RawPriceResponse {
  symbol: string;
  bid: string;
  ask: string;
  generatedAt: number;
  isMultiplierAdjusted: boolean;
}

export interface RawCorporateActionResponse {
  hasPendingAction: boolean;
  latestProcessedActionId?: string;
  latestProcessDate?: string;
}

// Canonicalize asset response
export function canonicalizeAsset(
  raw: RawAssetResponse,
  chainId: bigint
): {
  assetUid: string;
  tokenSymbol: string;
  tokenAddress: Address;
  chainId: bigint;
  currentMultiplier: bigint;
  pendingMultiplier?: bigint;
  pendingMultiplierEffectiveTime?: number;
  tradingCapability: UnitStateSnapshot['tradingCapability'];
} {
  return {
    assetUid: raw.assetUid,
    tokenSymbol: raw.tokenSymbol,
    tokenAddress: raw.deployment.tokenAddress.toLowerCase() as Address,
    chainId,
    currentMultiplier: BigInt(raw.currentMultiplier),
    pendingMultiplier: raw.pendingMultiplier ? BigInt(raw.pendingMultiplier) : undefined,
    pendingMultiplierEffectiveTime: raw.pendingMultiplierEffectiveTime,
    tradingCapability: {
      market: raw.tradingCapability.market,
      extended: raw.tradingCapability.extended,
      overnight: raw.tradingCapability.overnight,
      fractional: raw.tradingCapability.fractional,
    },
  };
}

// Canonicalize price response
export function canonicalizePrice(raw: RawPriceResponse): {
  rawBidUsd: bigint;
  rawAskUsd: bigint;
  quoteGeneratedAt: number;
  isMultiplierAdjusted: boolean;
} {
  return {
    rawBidUsd: BigInt(raw.bid),
    rawAskUsd: BigInt(raw.ask),
    quoteGeneratedAt: raw.generatedAt,
    isMultiplierAdjusted: raw.isMultiplierAdjusted,
  };
}

// Canonicalize corporate action response
export function canonicalizeCorporateAction(
  raw: RawCorporateActionResponse
): UnitStateSnapshot['corporateActionContext'] {
  return {
    hasPendingAction: raw.hasPendingAction,
    latestProcessedActionId: raw.latestProcessedActionId,
    latestProcessDate: raw.latestProcessDate,
  };
}

// Build complete state snapshot from canonicalized data
export function buildStateSnapshot(
  chainId: bigint,
  tokenAddress: Address,
  assetUid: string,
  tokenSymbol: string,
  rawBalance: bigint,
  currentMultiplierOffchain: bigint,
  currentMultiplierOnchain: bigint,
  pendingMultiplier?: bigint,
  pendingMultiplierEffectiveTime?: number,
  rawBidUsd?: bigint,
  rawAskUsd?: bigint,
  quoteGeneratedAt?: number,
  tradingCapability: UnitStateSnapshot['tradingCapability'] = {
    market: null,
    extended: null,
    overnight: null,
    fractional: null,
  },
  corporateActionContext: UnitStateSnapshot['corporateActionContext'] = {
    hasPendingAction: false,
  },
  observationAt: number = Date.now()
): UnitStateSnapshot {
  return {
    chainId,
    tokenAddress,
    assetUid,
    tokenSymbol,
    rawBalance,
    currentMultiplierOffchain,
    currentMultiplierOnchain,
    pendingMultiplier,
    pendingMultiplierEffectiveTime,
    rawBidUsd,
    rawAskUsd,
    quoteGeneratedAt,
    tradingCapability,
    corporateActionContext,
    observationAt,
    stateDigest: hashUnitState({
      chainId,
      tokenAddress,
      assetUid,
      currentMultiplier: currentMultiplierOffchain,
      rawBidUsd,
      rawAskUsd,
      observationAt,
    }),
  };
}

// Reconcile offchain and onchain state
export interface ReconciliationResult {
  reconciled: boolean;
  offchain: {
    multiplier: bigint;
    source: string;
  };
  onchain: {
    multiplier: bigint;
    source: string;
  };
  mismatch: boolean;
  diff: bigint;
  recommendation: 'proceed' | 'investigate' | 'halt';
}

export function reconcileState(
  offchainMultiplier: bigint,
  onchainMultiplier: bigint,
  tolerance: bigint = BigInt(0)
): ReconciliationResult {
  const diff = offchainMultiplier > onchainMultiplier
    ? offchainMultiplier - onchainMultiplier
    : onchainMultiplier - offchainMultiplier;
  
  const mismatch = diff > tolerance;
  
  let recommendation: 'proceed' | 'investigate' | 'halt' = 'proceed';
  if (mismatch) {
    // If difference is small, might be precision issue
    // If large, should halt
    const ratio = offchainMultiplier > BigInt(0)
      ? onchainMultiplier * 100n / offchainMultiplier
      : BigInt(0);
    
    if (ratio <= 95n || ratio >= 105n) {
      recommendation = 'halt';
    } else {
      recommendation = 'investigate';
    }
  }
  
  return {
    reconciled: !mismatch,
    offchain: {
      multiplier: offchainMultiplier,
      source: 'REST /assets',
    },
    onchain: {
      multiplier: onchainMultiplier,
      source: 'uiMultiplier()',
    },
    mismatch,
    diff,
    recommendation,
  };
}

// Format snapshot for display
export function formatSnapshot(snapshot: UnitStateSnapshot): string {
  return `
STATE SNAPSHOT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Chain ID: ${snapshot.chainId}
Token: ${snapshot.tokenAddress}
Asset UID: ${snapshot.assetUid}
Symbol: ${snapshot.tokenSymbol}

Raw Balance: ${snapshot.rawBalance.toString()} tokens

Current Multiplier (Offchain): ${snapshot.currentMultiplierOffchain.toString()}
Current Multiplier (Onchain): ${snapshot.currentMultiplierOnchain.toString()}

Pending Multiplier: ${snapshot.pendingMultiplier?.toString() ?? 'None'}
Pending Effective: ${snapshot.pendingMultiplierEffectiveTime 
  ? new Date(snapshot.pendingMultiplierEffectiveTime * 1000).toISOString() 
  : 'None'}

Quote (Bid): ${snapshot.rawBidUsd ? snapshot.rawBidUsd.toString() : 'N/A'} USD
Quote (Ask): ${snapshot.rawAskUsd ? snapshot.rawAskUsd.toString() : 'N/A'}
Quote Generated: ${snapshot.quoteGeneratedAt 
  ? new Date(snapshot.quoteGeneratedAt).toISOString() 
  : 'N/A'}

Trading Capability:
  Market: ${snapshot.tradingCapability.market ?? 'N/A'}
  Extended: ${snapshot.tradingCapability.extended ?? 'N/A'}
  Overnight: ${snapshot.tradingCapability.overnight ?? 'N/A'}
  Fractional: ${snapshot.tradingCapability.fractional ?? 'N/A'}

Corporate Actions:
  Has Pending: ${snapshot.corporateActionContext.hasPendingAction}
  Latest Action: ${snapshot.corporateActionContext.latestProcessedActionId ?? 'N/A'}

Observed At: ${new Date(snapshot.observationAt).toISOString()}
State Digest: ${snapshot.stateDigest}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
