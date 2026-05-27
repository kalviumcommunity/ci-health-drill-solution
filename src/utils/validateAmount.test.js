const { validateAmount } = require('./validateAmount');

describe('validateAmount', () => {
  test('accepts valid positive amount', () => {
    expect(validateAmount(100)).toBe(true);
  });

  test('accepts maximum allowed amount', () => {
    expect(validateAmount(1_000_000)).toBe(true);
  });

  test('rejects zero', () => {
    expect(validateAmount(0)).toBe(false);
  });

  test('rejects amount over maximum', () => {
    expect(validateAmount(1_000_001)).toBe(false);
  });

  test('rejects non-numeric string', () => {
    expect(validateAmount('100')).toBe(false);
  });

  test('rejects NaN', () => {
    expect(validateAmount(NaN)).toBe(false);
  });

  // Fix: unskipped — negative amount rejection is now enforced in validateAmount.js
  test('rejects negative amounts', () => {
    expect(validateAmount(-50)).toBe(false);
  });
});
