import { describe, it, expect } from 'vitest';

export function calculateCustomerBalance(currentBalance: number, entry: { type: 'CREDIT' | 'DEBIT'; amount: number }): number {
  if (entry.amount <= 0 || !Number.isFinite(entry.amount)) {
    throw new Error('Transaction amount must be a positive number');
  }
  return entry.type === 'CREDIT' ? currentBalance + entry.amount : currentBalance - entry.amount;
}

export function parseCreditLimit(val: unknown, fallback = 500): number {
  if (val === null || val === undefined) return fallback;
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) && num > 0 ? num : fallback;
}

describe('Unit Test: Ledger Calculations', () => {
  it('increases balance on a credit transaction', () => {
    expect(calculateCustomerBalance(100, { type: 'CREDIT', amount: 50 })).toBe(150);
  });

  it('decreases balance on a debit transaction', () => {
    expect(calculateCustomerBalance(150, { type: 'DEBIT', amount: 50 })).toBe(100);
  });

  it('rejects invalid amounts', () => {
    expect(() => calculateCustomerBalance(100, { type: 'CREDIT', amount: -20 })).toThrow();
    expect(() => calculateCustomerBalance(100, { type: 'CREDIT', amount: 0 })).toThrow();
  });
});

describe('Unit Test: Customer Credit Limit Coercion', () => {
  it('returns valid numbers greater than zero', () => {
    expect(parseCreditLimit(1500)).toBe(1500);
    expect(parseCreditLimit(2000)).toBe(2000);
  });

  it('parses numeric strings greater than zero', () => {
    expect(parseCreditLimit('2000')).toBe(2000);
    expect(parseCreditLimit('100.50')).toBe(100.5);
  });

  it('falls back to 500 on undefined or null', () => {
    expect(parseCreditLimit(undefined)).toBe(500);
    expect(parseCreditLimit(null)).toBe(500);
  });

  it('falls back to 500 on NaN or non-numeric strings', () => {
    expect(parseCreditLimit(NaN)).toBe(500);
    expect(parseCreditLimit('invalid')).toBe(500);
    expect(parseCreditLimit('')).toBe(500);
  });

  it('falls back to 500 on zero or negative numbers', () => {
    expect(parseCreditLimit(0)).toBe(500);
    expect(parseCreditLimit(-100)).toBe(500);
    expect(parseCreditLimit('-50')).toBe(500);
  });

  it('respects custom fallback if provided', () => {
    expect(parseCreditLimit(undefined, 1000)).toBe(1000);
    expect(parseCreditLimit('abc', 250)).toBe(250);
  });
});
