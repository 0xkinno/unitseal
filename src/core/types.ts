// Core type definitions for UnitSeal
// These types define the canonical data model for state binding

export type Address = `0x${string}`;
export type Hash = `0x${string}`;

// Chain IDs
export const RH_MAINNET_CHAIN_ID = 4663n;
export const RH_TESTNET_CHAIN_ID = 46630n;

// Trading capability modes
export type CapabilityMode = 'market' | 'extended' | 'overnight' | 'fractional' | null;

export interface TradingCapability {
  market: string | null;
  extended: string | null;
  overnight: string | null;
  fractional: string | null;
}

// Corporate action context
export interface CorporateActionContext {
  hasPendingAction: boolean;
  latestProcessedActionId?: string;
  latestProcessDate?: string;
}

// Unit state snapshot - the canonical economic state representation
export interface UnitStateSnapshot {
  chainId: bigint;
  tokenAddress: Address;
  assetUid: string;
  tokenSymbol: string;
  rawBalance: bigint;
  
  currentMultiplierOffchain: bigint;
  currentMultiplierOnchain: bigint;
  
  pendingMultiplier?: bigint;
  pendingMultiplierEffectiveTime?: number;
  
  rawBidUsd?: bigint;
  rawAskUsd?: bigint;
  quoteGeneratedAt?: number;
  
  tradingCapability: TradingCapability;
  
  corporateActionContext: CorporateActionContext;
  
  observationAt: number;
  stateDigest: Hash;
}

// Action types
export type ActionType = 'TRANSFER' | 'REBALANCE';

// Canonical action plan
export interface ActionPlan {
  actionId: string;
  userIntent: string;
  actionType: ActionType;
  token: Address;
  chainId: bigint;
  from: Address;
  to: Address;
  
  targetEconomicValueUsd?: bigint;
  rawAmount: bigint;
  
  maxSlippageBps?: number;
  expiry: number;
  
  requiredMultiplier: bigint;
  requiredCapability: string;
  
  rationale: string;
  planHash: Hash;
}

// Seal status
export type SealStatus = 'SEALED' | 'STALE' | 'EXECUTED' | 'REFUSED' | 'EXPIRED';

// UnitSeal - the cryptographic binding
export interface UnitSeal {
  sealId: string;
  planHash: Hash;
  stateHash: Hash;
  chainId: bigint;
  tokenAddress: Address;
  expectedMultiplier: bigint;
  rawAmount: bigint;
  recipient: Address;
  capability: string;
  observedAt: number;
  expiresAt: number;
  attestationHash: Hash;
  status: SealStatus;
}

// Freshness policy
export interface FreshnessPolicy {
  maxQuoteAgeMs: number;
  maxStateAgeMs: number;
}

// Default freshness policy (30 seconds for quotes)
export const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  maxQuoteAgeMs: 30000,
  maxStateAgeMs: 60000,
};

// Default seal expiry (5 minutes)
export const DEFAULT_SEAL_EXPIRY_MS = 5 * 60 * 1000;

// Verification result
export type VerificationResult = 
  | { status: 'PASS'; checkedAt: number }
  | { status: 'FAIL'; reason: string; checkedAt: number }
  | { status: 'HOLD'; reason: string; checkedAt: number };

// Check names for evidence
export type CheckName = 
  | 'asset_identity'
  | 'chain_identity'
  | 'multiplier_parity'
  | 'pending_corporate_action'
  | 'quote_semantics'
  | 'quote_freshness'
  | 'trading_capability'
  | 'replay_protection'
  | 'seal_expiry'
  | 'execution_payload';
