import { NextResponse } from 'next/server';
import { sealPlan } from '@/core/seal';
import type { ActionPlan, UnitStateSnapshot } from '@/core/types';

export async function POST(req: Request) {
  try {
    const { plan: rawPlan, snapshot: rawSnapshot } = await req.json();

    const plan: ActionPlan = {
      ...rawPlan,
      chainId: BigInt(rawPlan.chainId),
      rawAmount: BigInt(rawPlan.rawAmount),
      requiredMultiplier: BigInt(rawPlan.requiredMultiplier),
      targetEconomicValueUsd: rawPlan.targetEconomicValueUsd ? BigInt(rawPlan.targetEconomicValueUsd) : undefined,
    };

    const snapshot: UnitStateSnapshot = {
      ...rawSnapshot,
      chainId: BigInt(rawSnapshot.chainId),
      rawBalance: BigInt(rawSnapshot.rawBalance),
      currentMultiplierOffchain: BigInt(rawSnapshot.currentMultiplierOffchain),
      currentMultiplierOnchain: BigInt(rawSnapshot.currentMultiplierOnchain),
      rawBidUsd: rawSnapshot.rawBidUsd ? BigInt(rawSnapshot.rawBidUsd) : undefined,
      rawAskUsd: rawSnapshot.rawAskUsd ? BigInt(rawSnapshot.rawAskUsd) : undefined,
    };

    const seal = sealPlan(plan, snapshot);

    return NextResponse.json({
      success: true,
      seal: {
        ...seal,
        chainId: seal.chainId.toString(),
        expectedMultiplier: seal.expectedMultiplier.toString(),
        rawAmount: seal.rawAmount.toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate seal';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
