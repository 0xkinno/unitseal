import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

export async function POST(req: Request) {
  try {
    const { seal, guardAddress } = await req.json();

    const attestorKey = process.env.UNITSEAL_ATTESTOR_PRIVATE_KEY as Hex;
    if (!attestorKey) {
      throw new Error('UNITSEAL_ATTESTOR_PRIVATE_KEY environment variable is missing.');
    }

    const effectiveGuard = (guardAddress ||
      process.env.NEXT_PUBLIC_UNITSEAL_GUARD_ADDRESS ||
      process.env.UNITSEAL_GUARD_ADDRESS ||
      '0x2518853d8a6799734ded70857f0cffc26a175c14') as Address;

    const account = privateKeyToAccount(attestorKey);

    const chainId = BigInt(seal.chainId);
    const domain = {
      name: 'UnitSealGuard',
      version: '1',
      chainId,
      verifyingContract: effectiveGuard,
    } as const;

    const types = {
      SealAttestation: [
        { name: 'chainId', type: 'uint256' },
        { name: 'token', type: 'address' },
        { name: 'sealId', type: 'bytes32' },
        { name: 'planHash', type: 'bytes32' },
        { name: 'stateHash', type: 'bytes32' },
        { name: 'expectedMultiplier', type: 'uint256' },
        { name: 'rawAmount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'expiry', type: 'uint256' },
        { name: 'capability', type: 'string' },
      ],
    } as const;

    const message = {
      chainId,
      token: seal.tokenAddress as Address,
      sealId: (seal.sealId.startsWith('0x') ? seal.sealId : `0x${seal.sealId}`) as Hex,
      planHash: seal.planHash as Hex,
      stateHash: seal.stateHash as Hex,
      expectedMultiplier: BigInt(seal.expectedMultiplier),
      rawAmount: BigInt(seal.rawAmount),
      recipient: seal.recipient as Address,
      expiry: BigInt(Math.floor(seal.expiresAt / 1000)),
      capability: seal.capability || 'market',
    };

    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'SealAttestation',
      message,
    });

    return NextResponse.json({
      success: true,
      attestor: account.address,
      attestation: {
        ...message,
        chainId: message.chainId.toString(),
        expectedMultiplier: message.expectedMultiplier.toString(),
        rawAmount: message.rawAmount.toString(),
        expiry: message.expiry.toString(),
      },
      signature,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Attestation failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
