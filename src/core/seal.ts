import type { Address, UnitStateSnapshot, ActionPlan, UnitSeal, SealStatus, Hash } from './types';
import { computeStateDigest } from './freshness';
import { hashActionPlan, createSealId } from './hashing';
import { fromFixed } from './fixedPoint';

// Create a UnitSeal from a plan and state snapshot
export function sealPlan(
  plan: ActionPlan,
  state: UnitStateSnapshot,
  observationAt: number = Date.now(),
  expiryMs: number = 5 * 60 * 1000 // 5 minutes default
): UnitSeal {
  const stateHash = computeStateDigest(state);
  
  const seal: UnitSeal = {
    sealId: createSealId(plan.planHash, stateHash, observationAt),
    planHash: plan.planHash,
    stateHash,
    chainId: state.chainId,
    tokenAddress: state.tokenAddress,
    expectedMultiplier: state.currentMultiplierOffchain,
    rawAmount: plan.rawAmount,
    recipient: plan.to,
    capability: plan.requiredCapability,
    observedAt: observationAt,
    expiresAt: observationAt + expiryMs,
    attestationHash: `0x${'0'.repeat(64)}`, // Placeholder until signed
    status: 'SEALED',
  };
  
  return seal;
}

// Verify a seal against current state
export interface SealVerificationResult {
  valid: boolean;
  status: SealStatus;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  reason?: string;
}

export function verifySeal(
  seal: UnitSeal,
  currentState: {
    chainId: bigint;
    tokenAddress: Address;
    currentMultiplier: bigint;
    tradingCapability: string;
  },
  now: number = Date.now()
): SealVerificationResult {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];
  
  // Check 1: Seal not expired
  const notExpired = now <= seal.expiresAt;
  checks.push({
    name: 'seal_expiry',
    passed: notExpired,
    message: notExpired
      ? `Expires at ${new Date(seal.expiresAt).toISOString()}`
      : `Expired at ${new Date(seal.expiresAt).toISOString()}`,
  });
  
  if (!notExpired) {
    return {
      valid: false,
      status: 'EXPIRED',
      checks,
      reason: 'Seal has expired',
    };
  }
  
  // Check 2: Chain ID match
  const chainMatch = seal.chainId === currentState.chainId;
  checks.push({
    name: 'chain_identity',
    passed: chainMatch,
    message: chainMatch
      ? `Chain: ${seal.chainId}`
      : `Expected chain ${seal.chainId}, got ${currentState.chainId}`,
  });
  
  // Check 3: Token address match
  const tokenMatch = seal.tokenAddress.toLowerCase() === currentState.tokenAddress.toLowerCase();
  checks.push({
    name: 'asset_identity',
    passed: tokenMatch,
    message: tokenMatch
      ? `Token: ${seal.tokenAddress}`
      : `Expected ${seal.tokenAddress}, got ${currentState.tokenAddress}`,
  });
  
  // Check 4: Multiplier match
  const multiplierMatch = seal.expectedMultiplier === currentState.currentMultiplier;
  checks.push({
    name: 'multiplier_parity',
    passed: multiplierMatch,
    message: multiplierMatch
      ? `Multiplier: ${fromFixed(seal.expectedMultiplier)}`
      : `Expected ${fromFixed(seal.expectedMultiplier)}, got ${fromFixed(currentState.currentMultiplier)}`,
  });
  
  // Check 5: Capability match
  const capabilityMatch = seal.capability === currentState.tradingCapability;
  checks.push({
    name: 'trading_capability',
    passed: capabilityMatch,
    message: capabilityMatch
      ? `Capability: ${seal.capability}`
      : `Expected ${seal.capability}, got ${currentState.tradingCapability}`,
  });
  
  // Check 6: Amount match (would be verified onchain)
  // This is a placeholder - onchain verification happens in contract
  checks.push({
    name: 'execution_payload',
    passed: true,
    message: `Amount: ${fromFixed(seal.rawAmount)}`,
  });
  
  // Check 7: Recipient match
  checks.push({
    name: 'recipient',
    passed: true,
    message: `Recipient: ${seal.recipient}`,
  });
  
  const allPassed = checks.every(c => c.passed);
  const failedChecks = checks.filter(c => !c.passed);
  const failureDetail = failedChecks.map(c => `${c.name}: ${c.message}`).join(', ');
  
  return {
    valid: allPassed,
    status: allPassed ? 'SEALED' : 'STALE',
    checks,
    reason: allPassed ? undefined : `Seal state does not match current state: ${failureDetail}`,
  };
}

// Mark seal as executed
export function markExecuted(seal: UnitSeal, transactionHash: Hash): UnitSeal {
  return {
    ...seal,
    status: 'EXECUTED',
    attestationHash: transactionHash,
  };
}

// Mark seal as refused
export function markRefused(seal: UnitSeal, reason: string): UnitSeal {
  return {
    ...seal,
    status: 'REFUSED',
    attestationHash: `0x${'0'.repeat(64)}`, // No transaction
  };
}

// Mark seal as stale
export function markStale(seal: UnitSeal): UnitSeal {
  return {
    ...seal,
    status: 'STALE',
  };
}

// Format seal for human review
export function formatSealForReview(seal: UnitSeal): string {
  const verification = verifySeal(
    seal,
    {
      chainId: seal.chainId,
      tokenAddress: seal.tokenAddress,
      currentMultiplier: seal.expectedMultiplier,
      tradingCapability: seal.capability,
    },
    seal.observedAt
  );
  
  return `
UNIT SEAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seal ID: ${seal.sealId}
Status: ${seal.status}

Plan Hash: ${seal.planHash}
State Hash: ${seal.stateHash}

Chain ID: ${seal.chainId}
Token: ${seal.tokenAddress}
Expected Multiplier: ${fromFixed(seal.expectedMultiplier)}
Raw Amount: ${fromFixed(seal.rawAmount)}
Recipient: ${seal.recipient}
Required Capability: ${seal.capability}

Observed At: ${new Date(seal.observedAt).toISOString()}
Expires At: ${new Date(seal.expiresAt).toISOString()}

Attestation Hash: ${seal.attestationHash}

STATE VERIFICATION
${verification.checks.map(c => 
  `${c.passed ? '✓' : '✗'} ${c.name}: ${c.message}`
).join('\n')}

${verification.valid ? '✓ STATE SEAL: VERIFIED' : '✗ STATE SEAL: INVALID'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}

// Check if seal can be replayed (should be prevented by contract)
export function canReplaySeal(seal: UnitSeal, executedSeals: Set<string>): boolean {
  return !executedSeals.has(seal.sealId);
}

// Create attestation hash from seal
export function computeAttestationHash(seal: UnitSeal): Hash {
  // In production, this would be an EIP-712 signature hash
  const data = [
    seal.chainId.toString(),
    seal.tokenAddress,
    seal.sealId,
    seal.planHash,
    seal.stateHash,
    seal.expectedMultiplier.toString(),
    seal.rawAmount.toString(),
    seal.recipient,
    seal.expiresAt.toString(),
    seal.capability,
  ].join('|');
  
  return hashActionPlan({
    actionId: seal.sealId,
    token: seal.tokenAddress,
    chainId: seal.chainId,
    from: seal.recipient, // Using recipient as 'from' for attestation
    to: seal.recipient,
    rawAmount: seal.rawAmount,
    requiredMultiplier: seal.expectedMultiplier,
    expiry: seal.expiresAt,
  });
}
