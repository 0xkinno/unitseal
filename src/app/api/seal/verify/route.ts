import { NextResponse } from 'next/server';
import { verifySeal } from '@/core/seal';
import { readOnchainMultiplier } from '@/robinhood/onchain';
import type { UnitSeal, Address } from '@/core/types';

export async function POST(req: Request) {
  try {
    const { seal: rawSeal, currentMultiplierOverride } = await req.json();

    const seal: UnitSeal = {
      ...rawSeal,
      chainId: BigInt(rawSeal.chainId),
      expectedMultiplier: BigInt(rawSeal.expectedMultiplier),
      rawAmount: BigInt(rawSeal.rawAmount),
    };

    let currentMultiplier = BigInt(rawSeal.expectedMultiplier);
    if (currentMultiplierOverride !== undefined) {
      currentMultiplier = BigInt(currentMultiplierOverride);
    } else {
      currentMultiplier = await readOnchainMultiplier(seal.tokenAddress as Address);
    }

    const verification = verifySeal(seal, {
      chainId: seal.chainId,
      tokenAddress: seal.tokenAddress,
      currentMultiplier,
      tradingCapability: seal.capability as 'market' | 'extended' | 'overnight' | 'fractional',
    });

    return NextResponse.json({
      success: true,
      valid: verification.valid,
      status: verification.status,
      reason: verification.reason,
      expectedMultiplier: seal.expectedMultiplier.toString(),
      currentMultiplier: currentMultiplier.toString(),
      checkedAt: Date.now(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
