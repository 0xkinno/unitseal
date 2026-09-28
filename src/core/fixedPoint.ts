// Fixed-point arithmetic for monetary and multiplier calculations
// Uses integer representation with explicit decimal scale
// NO floating-point arithmetic for monetary values

export const DECIMALS = 18;
export const ONE = BigInt(10) ** BigInt(DECIMALS);

// Convert human-readable value to fixed-point
export function toFixed(value: string | number, decimals: number = DECIMALS): bigint {
  const str = String(value);
  const [intPart, fracPart = ''] = str.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(intPart + paddedFrac);
}

// Convert fixed-point to human-readable string
export function fromFixed(value: bigint, decimals: number = DECIMALS): string {
  const isNegative = value < 0n;
  const absValue = isNegative ? -value : value;
  const str = absValue.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, -decimals) || '0';
  const fracPart = str.slice(-decimals).replace(/0+$/, '');
  const formatted = fracPart ? `${intPart}.${fracPart}` : `${intPart}.0`;
  return isNegative ? `-${formatted}` : formatted;
}

// Add fixed-point values
export function fixedAdd(a: bigint, b: bigint): bigint {
  return a + b;
}

// Subtract fixed-point values
export function fixedSub(a: bigint, b: bigint): bigint {
  if (a < b) throw new Error('Underflow: result would be negative');
  return a - b;
}

// Multiply fixed-point by scalar
export function fixedMul(value: bigint, scalar: bigint): bigint {
  return (value * scalar) / ONE;
}

// Divide fixed-point by scalar
export function fixedDiv(value: bigint, scalar: bigint): bigint {
  if (scalar === BigInt(0)) throw new Error('Division by zero');
  return (value * ONE) / scalar;
}

// Multiply two fixed-point values (result in fixed-point)
export function fixedMulFixed(a: bigint, b: bigint): bigint {
  return (a * b) / ONE;
}

// Compare fixed-point values
export function fixedEq(a: bigint, b: bigint): boolean {
  return a === b;
}

export function fixedGt(a: bigint, b: bigint): boolean {
  return a > b;
}

export function fixedGte(a: bigint, b: bigint): boolean {
  return a >= b;
}

export function fixedLt(a: bigint, b: bigint): boolean {
  return a < b;
}

export function fixedLte(a: bigint, b: bigint): boolean {
  return a <= b;
}

// Calculate raw amount from target economic value
// rawAmount = targetEconomicValueUsd / (pricePerShare * multiplier)
export function calculateRawAmount(
  targetEconomicValueUsd: bigint,
  pricePerShareUsd: bigint,
  multiplier: bigint
): bigint {
  if (pricePerShareUsd === BigInt(0)) {
    throw new Error('Price cannot be zero');
  }
  if (multiplier === BigInt(0)) {
    throw new Error('Multiplier cannot be zero');
  }
  // rawAmount = targetValue / (price * multiplier)
  // = targetValue * ONE / (price * multiplier)
  const denominator = (pricePerShareUsd * multiplier) / ONE;
  if (denominator === BigInt(0)) {
    throw new Error('Calculation resulted in zero denominator');
  }
  return (targetEconomicValueUsd * ONE) / denominator;
}

// Calculate economic value from raw amount
// economicValue = rawAmount * pricePerShare * multiplier / ONE
export function calculateEconomicValue(
  rawAmount: bigint,
  pricePerShareUsd: bigint,
  multiplier: bigint
): bigint {
  return (rawAmount * pricePerShareUsd * multiplier) / (ONE * ONE);
}

// Apply multiplier to raw amount
export function applyMultiplier(rawAmount: bigint, multiplier: bigint): bigint {
  return (rawAmount * multiplier) / ONE;
}

// Calculate multiplier-adjusted price
export function multiplierAdjustedPrice(
  rawPrice: bigint,
  multiplier: bigint
): bigint {
  return (rawPrice * multiplier) / ONE;
}
