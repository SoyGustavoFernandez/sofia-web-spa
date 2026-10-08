import { calcularVuelto, roundMoney } from './vuelto.util';

describe('calcularVuelto', () => {
  it('returns the cash handed over minus the amount to pay', () => {
    expect(calcularVuelto(7.5, [10])).toBe(2.5);
  });

  it('returns 0 when the payment is exact', () => {
    expect(calcularVuelto(7.5, [7.5])).toBe(0);
  });

  it('returns 0 when the payments do not cover the amount yet', () => {
    expect(calcularVuelto(20, [5])).toBe(0);
  });

  it('handles a split payment where the cash exceeds what is left', () => {
    expect(calcularVuelto(50, [20, 40])).toBe(10);
  });

  it('returns 0 for non-cash payments that add up exactly to the amount', () => {
    expect(calcularVuelto(30, [10, 20])).toBe(0);
  });

  it('rounds to cents so floating point noise does not leave change', () => {
    expect(calcularVuelto(0.3, [0.1, 0.2])).toBe(0);
    expect(calcularVuelto(19.99, [20])).toBe(0.01);
    expect(calcularVuelto(33.333333, [40])).toBe(6.67);
  });

  it('treats a missing amount as 0', () => {
    expect(calcularVuelto(10, [NaN, 15])).toBe(5);
  });
});

describe('roundMoney', () => {
  it('rounds to two decimals', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(2.346)).toBe(2.35);
  });
});
