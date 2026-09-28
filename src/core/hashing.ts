import { keccak256, stringToBytes } from 'viem';
import type { Hash, Address } from './types';

// Deterministic hashing using keccak256
export function hashString(str: string): Hash {
  return keccak256(stringToBytes(str));
}

// Hash a canonical JSON representation deterministically
export function hashCanonical(obj: Record<string, unknown>): Hash {
  const sortedKeys = Object.keys(obj).sort();
  const canonical = sortedKeys
    .map((key) => {
      const value = obj[key];
      if (typeof value === 'bigint') {
        return `${key}:${value.toString()}`;
      }
      if (typeof value === 'object' && value !== null) {
        return `${key}:${JSON.stringify(value)}`;
      }
      return `${key}:${value}`;
    })
    .join('|');
  return hashString(canonical);
}

// Hash unit state snapshot
export function hashUnitState(state: {
  chainId: bigint;
  tokenAddress: Address;
  assetUid: string;
  currentMultiplier: bigint;
  rawBidUsd?: bigint;
  rawAskUsd?: bigint;
  observationAt: number;
}): Hash {
  return hashCanonical({
    chainId: state.chainId.toString(),
    tokenAddress: state.tokenAddress,
    assetUid: state.assetUid,
    currentMultiplier: state.currentMultiplier.toString(),
    rawBidUsd: state.rawBidUsd?.toString() ?? '0',
    rawAskUsd: state.rawAskUsd?.toString() ?? '0',
    observationAt: state.observationAt.toString(),
  });
}

// Hash action plan
export function hashActionPlan(plan: {
  actionId: string;
  token: Address;
  chainId: bigint;
  from: Address;
  to: Address;
  rawAmount: bigint;
  requiredMultiplier: bigint;
  expiry: number;
}): Hash {
  return hashCanonical({
    actionId: plan.actionId,
    token: plan.token,
    chainId: plan.chainId.toString(),
    from: plan.from,
    to: plan.to,
    rawAmount: plan.rawAmount.toString(),
    requiredMultiplier: plan.requiredMultiplier.toString(),
    expiry: plan.expiry.toString(),
  });
}

// Create seal ID deterministically
export function createSealId(
  planHash: Hash,
  stateHash: Hash,
  timestamp: number
): Hash {
  const data = `${planHash}${stateHash}${timestamp}`;
  return hashString(data);
}
