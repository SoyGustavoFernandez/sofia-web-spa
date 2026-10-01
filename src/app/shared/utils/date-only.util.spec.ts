import { buildLocalDate, fromDateOnly, toDateOnly, toLocalDayEndIso, toLocalDayStartIso, toLocalMidnightIso } from './date-only.util';

describe('date-only utils', () => {
  it('toDateOnly serializes local components, even late in the day', () => {
    expect(toDateOnly(new Date(2028, 11, 31, 23, 30))).toBe('2028-12-31');
    expect(toDateOnly(new Date(2027, 2, 5, 0, 0))).toBe('2027-03-05');
  });

  it('toDateOnly returns undefined for empty or invalid dates', () => {
    expect(toDateOnly(null)).toBeUndefined();
    expect(toDateOnly(undefined)).toBeUndefined();
    expect(toDateOnly(new Date(NaN))).toBeUndefined();
  });

  it('fromDateOnly reads yyyy-MM-dd as a local day', () => {
    const date = fromDateOnly('1990-07-15')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([1990, 6, 15, 0]);
  });

  it('fromDateOnly keeps the written day of a value with time and offset', () => {
    const date = fromDateOnly('2028-12-31T00:00:00+09:00')!;
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2028, 11, 31]);
  });

  it('fromDateOnly returns null for empty or malformed values', () => {
    expect(fromDateOnly(null)).toBeNull();
    expect(fromDateOnly('')).toBeNull();
    expect(fromDateOnly('31/12/2028')).toBeNull();
    expect(fromDateOnly('2027-02-31')).toBeNull();
  });

  it('round-trips a day through toDateOnly and fromDateOnly', () => {
    expect(toDateOnly(fromDateOnly('2026-10-01'))).toBe('2026-10-01');
  });

  it('toLocalMidnightIso emits local midnight with the explicit offset of that day', () => {
    const iso = toLocalMidnightIso(new Date(2028, 11, 31, 18, 45))!;
    expect(iso).toMatch(/^2028-12-31T00:00:00[+-]\d{2}:\d{2}$/);
    expect(new Date(iso).getTime()).toBe(new Date(2028, 11, 31).getTime());
  });

  it('toLocalMidnightIso returns undefined for empty dates', () => {
    expect(toLocalMidnightIso(null)).toBeUndefined();
    expect(toLocalMidnightIso(new Date(NaN))).toBeUndefined();
  });

  it('toLocalDayStartIso and toLocalDayEndIso bound the whole local day as instants', () => {
    const picked = new Date(2026, 9, 1, 15, 20);
    expect(new Date(toLocalDayStartIso(picked)!).getTime()).toBe(new Date(2026, 9, 1).getTime());
    expect(new Date(toLocalDayEndIso(picked)!).getTime()).toBe(new Date(2026, 9, 2).getTime() - 1);
    expect(toLocalDayStartIso(picked)).toMatch(/Z$/);
    expect(toLocalDayStartIso(null)).toBeUndefined();
    expect(toLocalDayEndIso(undefined)).toBeUndefined();
  });

  it('buildLocalDate rejects overflowing components', () => {
    expect(buildLocalDate(2027, 2, 31)).toBeNull();
    expect(buildLocalDate(2027, 13, 1)).toBeNull();
    expect(buildLocalDate(2028, 2, 29)).not.toBeNull();
  });
});
