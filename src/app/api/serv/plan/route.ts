import { NextResponse } from 'next/server';
import { requestServPlan } from '@/serv/adapter';
import { compileIntentToPlan } from '@/core/unitMath';
import { buildStateSnapshot, reconcileState } from '@/core/reconciler';
import { fetchStockPrice } from '@/robinhood/prices';
import { readOnchainMultiplier } from '@/robinhood/onchain';
import { fetchCorporateActionsContext } from '@/robinhood/corporateActions';
import type { Address } from '@/core/types';
import { toFixed } from '@/core/fixedPoint';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userIntent,
      tokenSymbol = 'AAPL',
      tokenAddress = '0x1111111111111111111111111111111111111111',
      senderAddress = '0x0000000000000000000000000000000000000000',
      recipientAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      chainId = 46630,
    } = body;

    // 1. Gather fresh multi-surface state
    const priceData = await fetchStockPrice(tokenSymbol);
    const onchainMultiplier = await readOnchainMultiplier(tokenAddress as Address);
    const offchainMultiplier = toFixed('1.0');
    const caContext = await fetchCorporateActionsContext(tokenSymbol);

    // 2. Query SERV Reasoning Engine
    const servResult = await requestServPlan({
      userIntent,
      senderAddress: senderAddress as Address,
      tokenSymbol,
      tokenAddress: tokenAddress as Address,
      recipientAddress: recipientAddress as Address,
      currentMultiplier: offchainMultiplier,
      pricePerShareUsd: priceData.midUsd,
      chainId: BigInt(chainId),
    });

    // 3. Compile plan with deterministic mathematical compiler
    const plan = compileIntentToPlan(
      userIntent,
      {
        userAddress: senderAddress as Address,
        chainId: BigInt(chainId),
        tokenAddress: tokenAddress as Address,
        tokenSymbol,
        currentMultiplier: offchainMultiplier,
        pricePerShareUsd: priceData.midUsd,
        tradingCapability: servResult.requiredCapability,
        maxSlippageBps: servResult.maxSlippageBps,
        expirySeconds: servResult.expirySeconds,
        recipientAddress: servResult.recipientAddress,
      },
      servResult.targetEconomicValueUsd
    );

    // 4. Build canonical state snapshot
    const snapshot = buildStateSnapshot(
      BigInt(chainId),
      tokenAddress as Address,
      `rh-stock-${tokenSymbol.toLowerCase()}`,
      tokenSymbol,
      toFixed('50000.0'), // Mock treasury balance
      offchainMultiplier,
      onchainMultiplier,
      undefined,
      undefined,
      priceData.bidUsd,
      priceData.askUsd,
      priceData.generatedAt,
      {
        market: 'tradable',
        extended: 'tradable',
        overnight: null,
        fractional: 'tradable',
      },
      caContext
    );

    // 5. Reconcile offchain and onchain state
    const reconciliation = reconcileState(offchainMultiplier, onchainMultiplier);

    return NextResponse.json({
      success: true,
      servResult,
      plan: {
        ...plan,
        chainId: plan.chainId.toString(),
        rawAmount: plan.rawAmount.toString(),
        requiredMultiplier: plan.requiredMultiplier.toString(),
        targetEconomicValueUsd: plan.targetEconomicValueUsd?.toString(),
      },
      snapshot: {
        ...snapshot,
        chainId: snapshot.chainId.toString(),
        rawBalance: snapshot.rawBalance.toString(),
        currentMultiplierOffchain: snapshot.currentMultiplierOffchain.toString(),
        currentMultiplierOnchain: snapshot.currentMultiplierOnchain.toString(),
        rawBidUsd: snapshot.rawBidUsd?.toString(),
        rawAskUsd: snapshot.rawAskUsd?.toString(),
      },
      reconciliation: {
        ...reconciliation,
        offchain: { ...reconciliation.offchain, multiplier: reconciliation.offchain.multiplier.toString() },
        onchain: { ...reconciliation.onchain, multiplier: reconciliation.onchain.multiplier.toString() },
        diff: reconciliation.diff.toString(),
      },
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Plan generation failed';
    console.error('[API /serv/plan error]:', errMessage);
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
