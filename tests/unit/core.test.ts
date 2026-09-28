import { describe, test } from 'node:test';
import { expect } from './expect';

// Import core modules
import { toFixed, fromFixed, fixedAdd, fixedSub, fixedMul, fixedDiv, fixedMulFixed, fixedEq, fixedGt, fixedLt } from '../../src/core/fixedPoint';
import { validateFreshness, validateTradingCapability, validateCorporateAction, validateState, DEFAULT_FRESHNESS_POLICY, fromFixed as fmtFixed } from '../../src/core/freshness';
import { hashString, hashCanonical, hashUnitState, createSealId } from '../../src/core/hashing';
import { calculateRawAmount, calculateEconomicValue, compileIntentToPlan, validatePlanAgainstState, formatPlanForReview } from '../../src/core/unitMath';
import { sealPlan, verifySeal, markExecuted, markRefused, formatSealForReview, computeAttestationHash } from '../../src/core/seal';
import { canonicalizeAsset, canonicalizePrice, buildStateSnapshot, reconcileState, formatSnapshot } from '../../src/core/reconciler';
import { Address, UnitStateSnapshot, ActionPlan, UnitSeal, TradingCapability, CorporateActionContext, Hash } from '../../src/core/types';

// Helper to create test addresses
const testAddress = (suffix: string): Address => `0x${suffix.padEnd(40, '0').slice(0, 40)}` as Address;

describe('FixedPoint Arithmetic', () => {
  test('toFixed and fromFixed are inverses', () => {
    const values = ['1.5', '0.001', '100.25', '0', '18.18'];
    for (const val of values) {
      const fixed = toFixed(val);
      const back = fromFixed(fixed);
      // Allow small rounding differences
      const original = parseFloat(val);
      const converted = parseFloat(back);
      expect(Math.abs(original - converted)).toBeLessThan(0.0001);
    }
  });

  test('fixedAdd works correctly', () => {
    const a = toFixed('1.5');
    const b = toFixed('2.5');
    const result = fixedAdd(a, b);
    expect(fromFixed(result)).toBe('4.0');
  });

  test('fixedSub works correctly', () => {
    const a = toFixed('5.0');
    const b = toFixed('2.0');
    const result = fixedSub(a, b);
    expect(fromFixed(result)).toBe('3.0');
  });

  test('fixedSub throws on underflow', () => {
    const a = toFixed('1.0');
    const b = toFixed('2.0');
    expect(() => fixedSub(a, b)).toThrow('Underflow');
  });

  test('fixedMul works correctly', () => {
    const a = toFixed('2.0');
    const b = toFixed('3.0');
    const result = fixedMulFixed(a, b);
    expect(fromFixed(result)).toBe('6.0');
  });

  test('fixedDiv works correctly', () => {
    const a = toFixed('10.0');
    const b = toFixed('2.0');
    const result = fixedDiv(a, b);
    expect(fromFixed(result)).toBe('5.0');
  });

  test('fixedDiv throws on zero division', () => {
    const a = toFixed('10.0');
    const b = BigInt(0);
    expect(() => fixedDiv(a, b)).toThrow('Division by zero');
  });
});

describe('Freshness Validation', () => {
  test('validateFreshness passes for fresh quote', () => {
    const snapshot: UnitStateSnapshot = {
      chainId: 46630n,
      tokenAddress: testAddress('abcd'),
      assetUid: 'AAPL',
      tokenSymbol: 'AAPL',
      rawBalance: 1000n,
      currentMultiplierOffchain: 10n ** 18n,
      currentMultiplierOnchain: 10n ** 18n,
      tradingCapability: { market: 'tradable', extended: null, overnight: null, fractional: null },
      corporateActionContext: { hasPendingAction: false },
      observationAt: Date.now(),
      stateDigest: '0x' + '0'.repeat(64),
      quoteGeneratedAt: Date.now() - 5000, // 5 seconds ago
    };

    const result = validateFreshness(snapshot, { maxQuoteAgeMs: 30000 });
    expect(result.valid).toBe(true);
    expect(result.ageMs).toBeLessThan(30000);
  });

  test('validateFreshness fails for stale quote', () => {
    const snapshot: UnitStateSnapshot = {
      chainId: 46630n,
      tokenAddress: testAddress('abcd'),
      assetUid: 'AAPL',
      tokenSymbol: 'AAPL',
      rawBalance: 1000n,
      currentMultiplierOffchain: 10n ** 18n,
      currentMultiplierOnchain: 10n ** 18n,
      tradingCapability: { market: 'tradable', extended: null, overnight: null, fractional: null },
      corporateActionContext: { hasPendingAction: false },
      observationAt: Date.now(),
      stateDigest: '0x' + '0'.repeat(64),
      quoteGeneratedAt: Date.now() - 60000, // 60 seconds ago
    };

    const result = validateFreshness(snapshot, { maxQuoteAgeMs: 30000 });
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('exceeds maximum');
  });

  test('validateTradingCapability passes for available capability', () => {
    const capability: TradingCapability = { market: 'tradable', extended: null, overnight: null, fractional: null };
    const result = validateTradingCapability(capability, 'market');
    expect(result.valid).toBe(true);
  });

  test('validateTradingCapability fails for unavailable capability', () => {
    const capability: TradingCapability = { market: null, extended: null, overnight: null, fractional: null };
    const result = validateTradingCapability(capability, 'market');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not available');
  });

  test('validateCorporateAction blocks on pending action', () => {
    const context: CorporateActionContext = { hasPendingAction: true };
    const result = validateCorporateAction(context, 'block');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('pending');
  });

  test('validateCorporateAction warns on pending action with warn policy', () => {
    const context: CorporateActionContext = { hasPendingAction: true };
    const result = validateCorporateAction(context, 'warn');
    expect(result.valid).toBe(true);
    expect(result.reason).toContain('review recommended');
  });
});

describe('Hashing', () => {
  test('hashString is deterministic', () => {
    const h1 = hashString('test');
    const h2 = hashString('test');
    expect(h1).toBe(h2);
  });

  test('hashString differs for different inputs', () => {
    const h1 = hashString('test1');
    const h2 = hashString('test2');
    expect(h1).not.toBe(h2);
  });

  test('hashCanonical is deterministic', () => {
    const obj = { b: 'value2', a: 'value1' };
    const h1 = hashCanonical(obj);
    const h2 = hashCanonical(obj);
    expect(h1).toBe(h2);
  });

  test('hashCanonical handles bigint', () => {
    const obj = { value: BigInt(12345) };
    const hash = hashCanonical(obj);
    expect(hash).toMatch(/^0x/);
  });
});

describe('Unit Math', () => {
  test('calculateRawAmount computes correctly', () => {
    // target = 100 USD, price = 50 USD/share, multiplier = 1.0
    const target = toFixed('100');
    const price = toFixed('50');
    const multiplier = 10n ** 18n;
    
    const rawAmount = calculateRawAmount(target, price, multiplier);
    // Expected: 100 / (50 * 1) = 2 tokens
    const expected = toFixed('2');
    expect(rawAmount).toBe(expected);
  });

  test('calculateRawAmount throws on zero price', () => {
    expect(() => calculateRawAmount(100n, BigInt(0), 10n ** 18n)).toThrow('Price cannot be zero');
  });

  test('calculateEconomicValue computes correctly', () => {
    // rawAmount = 2 tokens, price = 50 USD/share, multiplier = 1.0
    const rawAmount = toFixed('2');
    const price = toFixed('50');
    const multiplier = 10n ** 18n;
    
    const economicValue = calculateEconomicValue(rawAmount, price, multiplier);
    // Expected: 2 * 50 * 1 = 100 USD
    expect(economicValue).toBe(toFixed('100'));
  });

  test('compileIntentToPlan creates valid plan', () => {
    const context = {
      userAddress: testAddress('sender'),
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      tokenSymbol: 'AAPL',
      currentMultiplier: 10n ** 18n,
      pricePerShareUsd: toFixed('50'),
      tradingCapability: 'market',
      maxSlippageBps: 100,
      expirySeconds: 300,
    };

    const plan = compileIntentToPlan('Move 100 USD of AAPL', context, toFixed('100'));
    
    expect(plan.actionType).toBe('TRANSFER');
    expect(plan.token).toBe(context.tokenAddress);
    expect(plan.chainId).toBe(context.chainId);
    expect(plan.rawAmount).toBeGreaterThan(0n);
    expect(plan.requiredMultiplier).toBe(context.currentMultiplier);
    expect(plan.planHash).toMatch(/^0x/);
  });
});

describe('Seal', () => {
  test('sealPlan creates valid seal', () => {
    const plan: ActionPlan = {
      actionId: '0x1234',
      userIntent: 'Test',
      actionType: 'TRANSFER',
      token: testAddress('token'),
      chainId: 46630n,
      from: testAddress('sender'),
      to: testAddress('recipient'),
      rawAmount: toFixed('10'),
      expiry: Math.floor(Date.now() / 1000) + 300,
      requiredMultiplier: 10n ** 18n,
      requiredCapability: 'market',
      rationale: 'Test',
      planHash: '0x' + '1'.repeat(64),
    };

    const state: UnitStateSnapshot = {
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      assetUid: 'AAPL',
      tokenSymbol: 'AAPL',
      rawBalance: 1000n,
      currentMultiplierOffchain: 10n ** 18n,
      currentMultiplierOnchain: 10n ** 18n,
      tradingCapability: { market: 'tradable', extended: null, overnight: null, fractional: null },
      corporateActionContext: { hasPendingAction: false },
      observationAt: Date.now(),
      stateDigest: '0x' + '2'.repeat(64),
    };

    const seal = sealPlan(plan, state);
    
    expect(seal.sealId).toMatch(/^0x/);
    expect(seal.planHash).toBe(plan.planHash);
    expect(seal.expectedMultiplier).toBe(state.currentMultiplierOffchain);
    expect(seal.rawAmount).toBe(plan.rawAmount);
    expect(seal.status).toBe('SEALED');
  });

  test('verifySeal passes when state matches', () => {
    const seal: UnitSeal = {
      sealId: '0x' + '0'.repeat(64),
      planHash: '0x' + '1'.repeat(64),
      stateHash: '0x' + '2'.repeat(64),
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      expectedMultiplier: 10n ** 18n,
      rawAmount: toFixed('10'),
      recipient: testAddress('recipient'),
      capability: 'market',
      observedAt: Date.now(),
      expiresAt: Date.now() + 300000,
      attestationHash: '0x' + '3'.repeat(64),
      status: 'SEALED',
    };

    const currentState = {
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      currentMultiplier: 10n ** 18n,
      tradingCapability: 'market',
    };

    const result = verifySeal(seal, currentState);
    expect(result.valid).toBe(true);
    expect(result.status).toBe('SEALED');
  });

  test('verifySeal fails when multiplier changes', () => {
    const seal: UnitSeal = {
      sealId: '0x' + '0'.repeat(64),
      planHash: '0x' + '1'.repeat(64),
      stateHash: '0x' + '2'.repeat(64),
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      expectedMultiplier: 10n ** 18n, // 1.0
      rawAmount: toFixed('10'),
      recipient: testAddress('recipient'),
      capability: 'market',
      observedAt: Date.now(),
      expiresAt: Date.now() + 300000,
      attestationHash: '0x' + '3'.repeat(64),
      status: 'SEALED',
    };

    // Current multiplier changed to 0.5
    const currentState = {
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      currentMultiplier: 5n * 10n ** 17n, // 0.5
      tradingCapability: 'market',
    };

    const result = verifySeal(seal, currentState);
    expect(result.valid).toBe(false);
    expect(result.status).toBe('STALE');
    expect(result.reason).toContain('does not match');
  });

  test('verifySeal fails when expired', () => {
    const seal: UnitSeal = {
      sealId: '0x' + '0'.repeat(64),
      planHash: '0x' + '1'.repeat(64),
      stateHash: '0x' + '2'.repeat(64),
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      expectedMultiplier: 10n ** 18n,
      rawAmount: toFixed('10'),
      recipient: testAddress('recipient'),
      capability: 'market',
      observedAt: Date.now() - 600000, // 10 minutes ago
      expiresAt: Date.now() - 300000, // expired 5 minutes ago
      attestationHash: '0x' + '3'.repeat(64),
      status: 'SEALED',
    };

    const currentState = {
      chainId: 46630n,
      tokenAddress: testAddress('token'),
      currentMultiplier: 10n ** 18n,
      tradingCapability: 'market',
    };

    const result = verifySeal(seal, currentState);
    expect(result.valid).toBe(false);
    expect(result.status).toBe('EXPIRED');
  });
});

describe('Reconciliation', () => {
  test('reconcileState passes when multipliers match', () => {
    const result = reconcileState(10n ** 18n, 10n ** 18n);
    expect(result.reconciled).toBe(true);
    expect(result.mismatch).toBe(false);
    expect(result.recommendation).toBe('proceed');
  });

  test('reconcileState detects mismatch', () => {
    const result = reconcileState(10n ** 18n, 5n * 10n ** 17n); // 1.0 vs 0.5
    expect(result.reconciled).toBe(false);
    expect(result.mismatch).toBe(true);
    expect(result.recommendation).toBe('halt');
  });
});
