import { NextResponse } from 'next/server';
import { privateKeyToAccount } from 'viem/accounts';
import type { Address, Hex } from 'viem';

const DEFAULT_PRIVATE_KEY =
  '0xc1221f7f0df0d80cc70ee80d0842d101f0cf983e0fda39486e091bb3bebf72ae' as Hex;

export async function POST(req: Request) {
  try {
    const { seal, guardAddress = '0x0000000000000000000000000000000000000000' } = await req.json();

    const attestorKey =
      (process.env.UNITSEAL_ATTESTOR_PRIVATE_KEY as Hex) || DEFAULT_PRIVATE_KEY;
    const account = privateKeyToAccount(attestorKey);

    const chainId = BigInt(seal.chainId);
    const domain = {
      name: 'UnitSealGuard',
      version: '1',
      chainId,
      verifyingContract: guardAddress as Address,
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
