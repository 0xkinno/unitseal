import assert from 'node:assert/strict';

export const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  not: {
    toBe: (expected: any) => assert.notStrictEqual(actual, expected),
  },
  toBeLessThan: (expected: number) => assert.ok(actual < expected, `${actual} not less than ${expected}`),
  toBeGreaterThan: (expected: any) => assert.ok(actual > expected, `${actual} not greater than ${expected}`),
  toContain: (expected: string) =>
    assert.ok(
      typeof actual === 'string' && actual.toLowerCase().includes(expected.toLowerCase()),
      `${actual} does not contain ${expected}`
    ),
  toMatch: (expected: RegExp) => assert.ok(expected.test(actual), `${actual} does not match ${expected}`),
  toThrow: (expected?: string) => {
    assert.throws(actual, expected ? new RegExp(expected) : undefined);
  },
});
