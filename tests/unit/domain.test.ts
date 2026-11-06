import { describe, it, expect } from 'vitest';

function calculateCustomerBalance(currentBalance: number, entry: { type: 'CREDIT' | 'DEBIT'; amount: number }): number {
  if (entry.amount <= 0 || !Number.isFinite(entry.amount)) {
    throw new Error('Transaction amount must be a positive number');
  }
  return entry.type === 'CREDIT' ? currentBalance + entry.amount : currentBalance - entry.amount;
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
