import type { ActionType, Address } from '../core/types';

export interface ServIntentRequest {
  userIntent: string;
  senderAddress: Address;
  tokenSymbol: string;
  tokenAddress: Address;
  recipientAddress: Address;
  currentMultiplier: bigint;
  pricePerShareUsd: bigint;
  chainId: bigint;
}

export interface ServStructuredIntent {
  actionType: ActionType;
  tokenSymbol: string;
  tokenAddress: Address;
  recipientAddress: Address;
  targetEconomicValueUsd: bigint;
  requiredMultiplier: bigint;
  requiredCapability: string;
  maxSlippageBps: number;
  expirySeconds: number;
  rationale: string;
  servModelUsed: string;
  servCompletionId?: string;
}
