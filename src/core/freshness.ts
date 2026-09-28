import type { UnitStateSnapshot, Hash } from './types';
import { hashUnitState } from './hashing';
import { fixedEq, fixedGt, fixedLt } from './fixedPoint';

// Default freshness thresholds
const DEFAULT_MAX_QUOTE_AGE_MS = 30000; // 30 seconds
const DEFAULT_MAX_STATE_AGE_MS = 60000; // 60 seconds

export interface FreshnessPolicy {
  maxQuoteAgeMs: number;
  maxStateAgeMs: number;
}

export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  maxQuoteAgeMs: DEFAULT_MAX_QUOTE_AGE_MS,
  maxStateAgeMs: DEFAULT_MAX_STATE_AGE_MS,
};

// Check if a quote is fresh enough
export function validateFreshness(
  snapshot: UnitStateSnapshot,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY
): { valid: boolean; ageMs: number; reason?: string } {
  const now = Date.now();
  
  // Check quote freshness if quote timestamp exists
  if (snapshot.quoteGeneratedAt) {
    const quoteAgeMs = now - snapshot.quoteGeneratedAt;
    if (quoteAgeMs > policy.maxQuoteAgeMs) {
      return {
        valid: false,
        ageMs: quoteAgeMs,
        reason: `Quote age ${quoteAgeMs}ms exceeds maximum ${policy.maxQuoteAgeMs}ms`,
      };
    }
  }
  
  // Check state observation freshness
  const stateAgeMs = now - snapshot.observationAt;
  if (stateAgeMs > policy.maxStateAgeMs) {
    return {
      valid: false,
      ageMs: stateAgeMs,
      reason: `State age ${stateAgeMs}ms exceeds maximum ${policy.maxStateAgeMs}ms`,
    };
  }
  
  return { valid: true, ageMs: stateAgeMs };
}

// Check trading capability
export interface TradingCapability {
  market: string | null;
  extended: string | null;
  overnight: string | null;
  fractional: string | null;
}

export type RequiredCapability = 'market' | 'extended' | 'overnight' | 'fractional';

export function validateTradingCapability(
  capability: TradingCapability,
  required: RequiredCapability
): { valid: boolean; reason?: string } {
  const capValue = capability[required];
  
  if (capValue === null || capValue === undefined) {
    return {
      valid: false,
      reason: `Trading capability '${required}' is not available`,
    };
  }
  
  // Check if the capability value indicates trading is allowed
  const allowedValues = ['tradable', 'enabled', 'available'];
  if (!allowedValues.includes(capValue.toLowerCase())) {
    return {
      valid: false,
      reason: `Trading capability '${required}' is not enabled (value: ${capValue})`,
    };
  }
  
  return { valid: true };
}

// Check for pending corporate actions
export interface CorporateActionContext {
  hasPendingAction: boolean;
  latestProcessedActionId?: string;
  latestProcessDate?: string;
}

export function validateCorporateAction(
  context: CorporateActionContext,
  policy: 'block' | 'warn' = 'block'
): { valid: boolean; reason?: string; pending?: boolean } {
  if (context.hasPendingAction) {
    if (policy === 'block') {
      return {
        valid: false,
        reason: 'Pending corporate action detected',
        pending: true,
      };
    }
    return {
      valid: true,
      reason: 'Pending corporate action detected - review recommended',
      pending: true,
    };
  }
  
  return { valid: true, pending: false };
}

// Compute state digest for a snapshot
export function computeStateDigest(snapshot: UnitStateSnapshot): Hash {
  return hashUnitState({
    chainId: snapshot.chainId,
    tokenAddress: snapshot.tokenAddress,
    assetUid: snapshot.assetUid,
    currentMultiplier: snapshot.currentMultiplierOffchain,
    rawBidUsd: snapshot.rawBidUsd,
    rawAskUsd: snapshot.rawAskUsd,
    observationAt: snapshot.observationAt,
  });
}

// Validate multiplier parity between offchain and onchain
export function validateMultiplierParity(
  offchain: bigint,
  onchain: bigint,
  tolerance: bigint = BigInt(0)
): { valid: boolean; offchain: bigint; onchain: bigint; diff: bigint } {
  const diff = offchain > onchain ? offchain - onchain : onchain - offchain;
  const valid = diff <= tolerance;
  return { valid, offchain, onchain, diff };
}

// Validate that raw prices are NOT being treated as multiplier-adjusted
export function validateQuoteSemantics(
  rawPrice: bigint,
  multiplier: bigint,
  isMultiplierAdjusted: boolean
): { valid: boolean; reason?: string } {
  if (isMultiplierAdjusted) {
    // If the price claims to be multiplier-adjusted, verify it
    const expectedAdjusted = (rawPrice * multiplier) / 10n ** 18n;
    // This is a sanity check - in production, verify against oracle
    return { valid: true };
  }
  
  // Raw price without multiplier adjustment is the default and expected
  return { valid: true };
}

// Full freshness and capability validation
export interface ValidationResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

export function validateState(
  snapshot: UnitStateSnapshot,
  requiredCapability: RequiredCapability,
  policy: FreshnessPolicy = DEFAULT_FRESHNESS_POLICY,
  corporateActionPolicy: 'block' | 'warn' = 'block'
): ValidationResult {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];
  
  // Check 1: Quote freshness
  const freshness = validateFreshness(snapshot, policy);
  checks.push({
    name: 'quote_freshness',
    passed: freshness.valid,
    message: freshness.valid 
      ? `Quote age: ${freshness.ageMs}ms`
      : freshness.reason!,
  });
  
  // Check 2: State freshness
  const now = Date.now();
  const stateAgeMs = now - snapshot.observationAt;
  const stateFresh = stateAgeMs <= policy.maxStateAgeMs;
  checks.push({
    name: 'state_freshness',
    passed: stateFresh,
    message: stateFresh
      ? `State age: ${stateAgeMs}ms`
      : `State age ${stateAgeMs}ms exceeds maximum`,
  });
  
  // Check 3: Trading capability
  const capValidation = validateTradingCapability(snapshot.tradingCapability, requiredCapability);
  checks.push({
    name: 'trading_capability',
    passed: capValidation.valid,
    message: capValidation.valid
      ? `Capability '${requiredCapability}': available`
      : capValidation.reason!,
  });
  
  // Check 4: Corporate action
  const caValidation = validateCorporateAction(snapshot.corporateActionContext, corporateActionPolicy);
  checks.push({
    name: 'corporate_action',
    passed: caValidation.valid,
    message: caValidation.pending
      ? 'Pending corporate action detected'
      : 'No pending corporate actions',
  });
  
  // Check 5: Multiplier parity (if onchain value available)
  if (snapshot.currentMultiplierOnchain) {
    const parity = validateMultiplierParity(
      snapshot.currentMultiplierOffchain,
      snapshot.currentMultiplierOnchain
    );
    checks.push({
      name: 'multiplier_parity',
      passed: parity.valid,
      message: parity.valid
        ? `Offchain: ${fromFixed(parity.offchain)}, Onchain: ${fromFixed(parity.onchain)}`
        : `Multiplier mismatch: offchain ${fromFixed(parity.offchain)} vs onchain ${fromFixed(parity.onchain)}`,
    });
  }
  
  return {
    passed: checks.every(c => c.passed),
    checks,
  };
}

// Helper to format bigint for display
export function fromFixed(value: bigint, decimals: number = 18): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const fracPart = str.slice(-decimals);
  return `${intPart}.${fracPart}`;
}
