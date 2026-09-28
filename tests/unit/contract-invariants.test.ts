import { describe, test } from 'node:test';
import { expect } from './expect';
import { privateKeyToAccount } from 'viem/accounts';
import { recoverTypedDataAddress, type Hex, type Address } from 'viem';
import { createSealId, hashActionPlan, hashUnitState } from '../../src/core/hashing';
import { toFixed } from '../../src/core/fixedPoint';
import { verifySeal } from '../../src/core/seal';
import type { UnitSeal } from '../../src/core/types';

describe('UnitSealGuard Contract & EIP-712 Invariants', () => {
  const attestorPk = '0x638318a0b7dd06356af0a3439f6f60928fd61dba023e5bd5a54f9100100bb8e4' as Hex;
  const attestorAccount = privateKeyToAccount(attestorPk);
  const guardAddress = '0x9999999999999999999999999999999999999999' as Address;
  const chainId = 46630n;

  const domain = {
    name: 'UnitSealGuard',
    version: '1',
    chainId,
    verifyingContract: guardAddress,
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

  const sampleSeal: UnitSeal = {
    sealId: '0x9f4a7c182b81093d5678129034aabbcc11223344556677889900aabbccddeeff',
    planHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    stateHash: '0x222233334444555566667777888899990000aaaabbbbccccddddeeeeffff0000',
    chainId,
    tokenAddress: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9' as Address,
    expectedMultiplier: toFixed('1.0'),
    rawAmount: toFixed('50.0'),
    recipient: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8' as Address,
    capability: 'market',
    observedAt: Date.now(),
    expiresAt: Date.now() + 300000,
    attestationHash: '0x33334444555566667777888899990000aaaabbbbccccddddeeeeffff00001111',
    status: 'SEALED',
  };

  test('EIP-712 attestation signature matches trusted attestor', async () => {
    const message = {
      chainId: sampleSeal.chainId,
      token: sampleSeal.tokenAddress,
      sealId: sampleSeal.sealId as Hex,
      planHash: sampleSeal.planHash as Hex,
      stateHash: sampleSeal.stateHash as Hex,
      expectedMultiplier: sampleSeal.expectedMultiplier,
      rawAmount: sampleSeal.rawAmount,
      recipient: sampleSeal.recipient,
      expiry: BigInt(Math.floor(sampleSeal.expiresAt / 1000)),
      capability: sampleSeal.capability,
    };

    const signature = await attestorAccount.signTypedData({
      domain,
      types,
      primaryType: 'SealAttestation',
      message,
    });

    const recovered = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: 'SealAttestation',
      message,
      signature,
    });

    expect(recovered.toLowerCase()).toBe(attestorAccount.address.toLowerCase());
  });

  test('Rejects signature from unauthorized party', async () => {
    const fakePk = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
    const fakeAccount = privateKeyToAccount(fakePk);

    const message = {
      chainId: sampleSeal.chainId,
      token: sampleSeal.tokenAddress,
      sealId: sampleSeal.sealId as Hex,
      planHash: sampleSeal.planHash as Hex,
      stateHash: sampleSeal.stateHash as Hex,
      expectedMultiplier: sampleSeal.expectedMultiplier,
      rawAmount: sampleSeal.rawAmount,
      recipient: sampleSeal.recipient,
      expiry: BigInt(Math.floor(sampleSeal.expiresAt / 1000)),
      capability: sampleSeal.capability,
    };

    const signature = await fakeAccount.signTypedData({
      domain,
      types,
      primaryType: 'SealAttestation',
      message,
    });

    const recovered = await recoverTypedDataAddress({
      domain,
      types,
      primaryType: 'SealAttestation',
      message,
      signature,
    });

    expect(recovered.toLowerCase()).not.toBe(attestorAccount.address.toLowerCase());
  });

  test('Rejection on onchain multiplier mismatch (Break Path)', () => {
    const verification = verifySeal(sampleSeal, {
      chainId: sampleSeal.chainId,
      tokenAddress: sampleSeal.tokenAddress,
      currentMultiplier: toFixed('0.5'), // Changed from expected 1.0
      tradingCapability: 'market',
    });

    expect(verification.valid).toBe(false);
    expect(verification.status).toBe('STALE');
    expect(verification.reason).toContain('multiplier');
  });

  test('Rejection on seal deadline expiry', () => {
    const expiredSeal = {
      ...sampleSeal,
      expiresAt: Date.now() - 10000, // Expired 10 seconds ago
    };

    const verification = verifySeal(expiredSeal, {
      chainId: sampleSeal.chainId,
      tokenAddress: sampleSeal.tokenAddress,
      currentMultiplier: sampleSeal.expectedMultiplier,
      tradingCapability: 'market',
    });

    expect(verification.valid).toBe(false);
    expect(verification.status).toBe('EXPIRED');
  });

  test('Rejection on chain ID mismatch', () => {
    const verification = verifySeal(sampleSeal, {
      chainId: 1n, // Mainnet Ethereum instead of Robinhood Chain
      tokenAddress: sampleSeal.tokenAddress,
      currentMultiplier: sampleSeal.expectedMultiplier,
      tradingCapability: 'market',
    });

    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('chain');
  });
});
