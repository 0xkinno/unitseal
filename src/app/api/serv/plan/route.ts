import { NextResponse } from 'next/server';
import { requestServPlan } from '@/serv/adapter';
import { compileIntentToPlan } from '@/core/unitMath';
import { buildStateSnapshot, reconcileState } from '@/core/reconciler';
import { fetchStockPrice } from '@/robinhood/prices';
import { readOnchainMultiplier, readTokenBalance } from '@/robinhood/onchain';
import { fetchCorporateActionsContext } from '@/robinhood/corporateActions';
import { CANONICAL_STOCK_TOKENS } from '@/robinhood/assets';
import type { Address } from '@/core/types';

// Helper to safely serialize objects containing BigInts for JSON response
function serializeBigInts<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userIntent,
      tokenSymbol = 'AAPL',
      senderAddress = '0x1000000000000000000000000000000000000001',
      recipientAddress = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      chainId = 4663, // Robinhood Chain Mainnet default
    } = body;

    // 1. Resolve canonical stock token from registry
    const upperSymbol = tokenSymbol.toUpperCase();
    const canonicalAsset = CANONICAL_STOCK_TOKENS.find((t) => t.symbol === upperSymbol);
    if (!canonicalAsset) {
      throw new Error(`Unsupported token symbol: ${tokenSymbol}. Must be an approved Robinhood Chain Stock Token.`);
    }

    const tokenAddress = canonicalAsset.address;
    const effectiveChainId = BigInt(canonicalAsset.chainId || chainId || 4663);

    // 2. Gather fresh multi-surface state
    const priceData = await fetchStockPrice(upperSymbol);
    const onchainMultiplier = await readOnchainMultiplier(tokenAddress as Address);
    const offchainMultiplier = canonicalAsset.currentMultiplier;
    const caContext = await fetchCorporateActionsContext(upperSymbol);

    // Read real token balance if valid address provided
    let rawBalance = 0n;
    if (senderAddress && senderAddress !== '0x0000000000000000000000000000000000000000') {
      try {
        rawBalance = await readTokenBalance(tokenAddress as Address, senderAddress as Address);
      } catch {
        rawBalance = 0n;
      }
    }

    // 3. Query SERV Reasoning Engine
    const servResult = await requestServPlan({
      userIntent,
      senderAddress: senderAddress as Address,
      tokenSymbol: upperSymbol,
      tokenAddress: tokenAddress as Address,
      recipientAddress: recipientAddress as Address,
      currentMultiplier: offchainMultiplier,
      pricePerShareUsd: priceData.midUsd,
      chainId: effectiveChainId,
    });

    // 4. Compile plan with deterministic mathematical compiler
    const plan = compileIntentToPlan(
      userIntent,
      {
        userAddress: senderAddress as Address,
        chainId: effectiveChainId,
        tokenAddress: tokenAddress as Address,
        tokenSymbol: upperSymbol,
        currentMultiplier: offchainMultiplier,
        pricePerShareUsd: priceData.midUsd,
        tradingCapability: servResult.requiredCapability,
        maxSlippageBps: servResult.maxSlippageBps,
        expirySeconds: servResult.expirySeconds,
        recipientAddress: servResult.recipientAddress,
      },
      servResult.targetEconomicValueUsd
    );

    // 5. Build canonical state snapshot
    const snapshot = buildStateSnapshot(
      effectiveChainId,
      tokenAddress as Address,
      canonicalAsset.assetUid,
      upperSymbol,
      rawBalance,
      offchainMultiplier,
      onchainMultiplier,
      canonicalAsset.pendingMultiplier,
      canonicalAsset.pendingMultiplierEffectiveTime,
      priceData.bidUsd,
      priceData.askUsd,
      priceData.generatedAt,
      {
        market: canonicalAsset.capabilities.market ? 'tradable' : null,
        extended: canonicalAsset.capabilities.extended ? 'tradable' : null,
        overnight: canonicalAsset.capabilities.overnight ? 'tradable' : null,
        fractional: canonicalAsset.capabilities.fractional ? 'tradable' : null,
      },
      caContext
    );

    // 6. Reconcile offchain and onchain state
    const reconciliation = reconcileState(offchainMultiplier, onchainMultiplier);

    const payload = serializeBigInts({
      success: true,
      servResult,
      plan,
      snapshot,
      reconciliation,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Plan generation failed';
    console.error('[API /serv/plan error]:', errMessage);
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
