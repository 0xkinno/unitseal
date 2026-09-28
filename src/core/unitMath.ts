import type { Address, ActionPlan, Hash } from './types';
import { hashActionPlan } from './hashing';
import { toFixed, fromFixed, fixedMul, fixedDiv } from './fixedPoint';

// Calculate raw token amount from target economic value
// rawAmount = targetEconomicValueUsd / (pricePerShareUsd * multiplier / ONE)
export function calculateRawAmount(
  targetEconomicValueUsd: bigint,
  pricePerShareUsd: bigint,
  multiplier: bigint
): bigint {
  if (pricePerShareUsd === BigInt(0)) {
    throw new Error('Price cannot be zero');
  }
  if (multiplier === BigInt(0)) {
    throw new Error('Multiplier cannot be zero');
  }
  
  // denominator = price * multiplier / ONE
  const denominator = fixedMul(pricePerShareUsd, multiplier);
  if (denominator === BigInt(0)) {
    throw new Error('Calculation resulted in zero denominator');
  }
  
  // rawAmount = targetValue * ONE / denominator
  return (targetEconomicValueUsd * 10n ** 18n) / denominator;
}

// Calculate economic value from raw amount
// economicValue = rawAmount * pricePerShareUsd * multiplier / ONE^2
export function calculateEconomicValue(
  rawAmount: bigint,
  pricePerShareUsd: bigint,
  multiplier: bigint
): bigint {
  // numerator = rawAmount * price * multiplier
  const numerator = rawAmount * pricePerShareUsd * multiplier;
  // denominator = ONE^2
  const denominator = 10n ** 36n;
  return numerator / denominator;
}

// Compile SERV interpretation into canonical action plan
export interface PlanCompileContext {
  userAddress: Address;
  chainId: bigint;
  tokenAddress: Address;
  tokenSymbol: string;
  currentMultiplier: bigint;
  pricePerShareUsd: bigint;
  tradingCapability: string;
  maxSlippageBps: number;
  expirySeconds: number;
  recipientAddress?: Address;
}

export function compileIntentToPlan(
  userIntent: string,
  context: PlanCompileContext,
  targetEconomicValueUsd?: bigint
): ActionPlan {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + context.expirySeconds;
  
  // Calculate raw amount from target economic value
  let rawAmount: bigint;
  if (targetEconomicValueUsd) {
    rawAmount = calculateRawAmount(
      targetEconomicValueUsd,
      context.pricePerShareUsd,
      context.currentMultiplier
    );
  } else {
    // Default: move 10% of current position
    // This would normally come from SERV interpretation
    rawAmount = 10n ** 18n; // 1 token as default
  }
  
  const plan: ActionPlan = {
    actionId: generateActionId(),
    userIntent,
    actionType: 'TRANSFER',
    token: context.tokenAddress,
    chainId: context.chainId,
    from: context.userAddress,
    to: context.recipientAddress || generateRecipientAddress(),
    targetEconomicValueUsd,
    rawAmount,
    maxSlippageBps: context.maxSlippageBps,
    expiry,
    requiredMultiplier: context.currentMultiplier,
    requiredCapability: context.tradingCapability,
    rationale: generateRationale(userIntent, context),
    planHash: hashActionPlan({
      actionId: '',
      token: context.tokenAddress,
      chainId: context.chainId,
      from: context.userAddress,
      to: generateRecipientAddress(),
      rawAmount,
      requiredMultiplier: context.currentMultiplier,
      expiry,
    }),
  };
  
  // Compute actual plan hash after all fields are set
  plan.planHash = hashActionPlan(plan);
  
  return plan;
}

// Generate a unique action ID
function generateActionId(): string {
  const timestamp = Date.now().toString(16);
  const random = Math.random().toString(16).slice(2, 10);
  return `0x${timestamp}${random}`;
}

// Generate placeholder recipient (would come from SERV)
function generateRecipientAddress(): Address {
  // In production, this comes from SERV interpretation
  return `0x${'abcdef'.repeat(20)}` as Address;
}

// Generate rationale from intent
function generateRationale(
  intent: string,
  context: PlanCompileContext
): string {
  const lowerIntent = intent.toLowerCase();
  
  if (lowerIntent.includes('reduce') || lowerIntent.includes('decrease')) {
    return `Reduce ${context.tokenSymbol} exposure to target allocation`;
  }
  if (lowerIntent.includes('increase') || lowerIntent.includes('add')) {
    return `Increase ${context.tokenSymbol} position to target allocation`;
  }
  if (lowerIntent.includes('rebalance')) {
    return `Rebalance ${context.tokenSymbol} position per target allocation`;
  }
  return `Execute ${context.tokenSymbol} transfer per operator intent`;
}

// Validate plan against state
export function validatePlanAgainstState(
  plan: ActionPlan,
  currentMultiplier: bigint,
  currentCapability: string
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check multiplier
  if (plan.requiredMultiplier !== currentMultiplier) {
    reasons.push(
      `Multiplier changed: approved ${fromFixed(plan.requiredMultiplier)}, current ${fromFixed(currentMultiplier)}`
    );
  }
  
  // Check capability
  if (plan.requiredCapability !== currentCapability) {
    reasons.push(
      `Capability changed: approved ${plan.requiredCapability}, current ${currentCapability}`
    );
  }
  
  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > plan.expiry) {
    reasons.push(`Plan expired at timestamp ${plan.expiry}`);
  }
  
  return {
    valid: reasons.length === 0,
    reasons,
  };
}

// Format plan for human review
export function formatPlanForReview(plan: ActionPlan): string {
  return `
ACTION PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Intent: ${plan.userIntent}

Action Type: ${plan.actionType}
Token: ${plan.token}
Chain ID: ${plan.chainId}

From: ${plan.from}
To: ${plan.to}

Raw Amount: ${fromFixed(plan.rawAmount)}
Target Economic Value: ${plan.targetEconomicValueUsd ? fromFixed(plan.targetEconomicValueUsd) + ' USD' : 'N/A'}

Required Multiplier: ${fromFixed(plan.requiredMultiplier)}
Required Capability: ${plan.requiredCapability}

Max Slippage: ${plan.maxSlippageBps ?? 0} bps
Expires: ${new Date(plan.expiry * 1000).toISOString()}

Rationale: ${plan.rationale}

Plan Hash: ${plan.planHash}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();
}
