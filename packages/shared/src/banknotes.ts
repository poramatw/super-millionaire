import type { BanknoteBreakdown, BanknoteDenomination } from './types.js';

export const BANKNOTE_DENOMINATIONS: readonly BanknoteDenomination[] = [
  5000,
  1000,
  500,
  100,
  50,
  10,
] as const;

export const INITIAL_CASH = 15000;

export const INITIAL_BANKNOTES: Readonly<BanknoteBreakdown> = {
  5000: 2,
  1000: 4,
  500: 1,
  100: 4,
  50: 1,
  10: 5,
};

export function createEmptyBanknotes(): BanknoteBreakdown {
  return {
    5000: 0,
    1000: 0,
    500: 0,
    100: 0,
    50: 0,
    10: 0,
  };
}

export function cloneBanknotes(notes: Readonly<BanknoteBreakdown>): BanknoteBreakdown {
  return {
    5000: notes[5000],
    1000: notes[1000],
    500: notes[500],
    100: notes[100],
    50: notes[50],
    10: notes[10],
  };
}

export function sumBanknotes(notes: Readonly<BanknoteBreakdown>): number {
  return (
    notes[5000] * 5000 +
    notes[1000] * 1000 +
    notes[500] * 500 +
    notes[100] * 100 +
    notes[50] * 50 +
    notes[10] * 10
  );
}

/**
 * Round a Thai Baht amount to the nearest 10 THB (used e.g. for 10% unmortgage interest).
 */
export function roundToNearestTen(amount: number): number {
  return Math.round(amount / 10) * 10;
}

/**
 * Convert any non-negative multiple-of-10 balance into clean Thai banknote counts.
 * Uses greedy denomination decomposition from 5,000 THB down to 10 THB.
 */
export function computeBanknotes(amount: number): BanknoteBreakdown {
  const breakdown = createEmptyBanknotes();
  if (!Number.isFinite(amount) || amount <= 0) {
    return breakdown;
  }

  let remaining = Math.round(amount / 10) * 10;
  for (const denom of BANKNOTE_DENOMINATIONS) {
    if (remaining >= denom) {
      const count = Math.floor(remaining / denom);
      breakdown[denom] = count;
      remaining -= count * denom;
    }
  }
  return breakdown;
}
