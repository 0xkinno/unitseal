import { NextResponse } from 'next/server';
import { sealPlan } from '@/core/seal';
import type { ActionPlan, UnitStateSnapshot } from '@/core/types';

function serializeBigInts<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
  );
}

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
      pendingMultiplier: rawSnapshot.pendingMultiplier ? BigInt(rawSnapshot.pendingMultiplier) : undefined,
    };

    const seal = sealPlan(plan, snapshot);

    const payload = serializeBigInts({
      success: true,
      seal,
    });

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate seal';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
