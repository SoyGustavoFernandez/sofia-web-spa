import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { SOFIA_DATE_FORMATS, SofiaDateAdapter, dateLocaleForLang } from './sofia-date-adapter';

function ymd(date: Date | null): number[] | null {
  return date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()] : null;
}

describe('SofiaDateAdapter', () => {
  let adapter: DateAdapter<Date>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: MAT_DATE_LOCALE, useValue: 'es-PE' },
        { provide: DateAdapter, useClass: SofiaDateAdapter },
      ],
    });
    adapter = TestBed.inject<DateAdapter<Date>>(DateAdapter);
  });

  it('parses d/M/yyyy in Spanish', () => {
    expect(ymd(adapter.parse('31/12/2028', null))).toEqual([2028, 12, 31]);
    expect(ymd(adapter.parse('05/03/2027', null))).toEqual([2027, 3, 5]);
    expect(ymd(adapter.parse('5/3/2027', null))).toEqual([2027, 3, 5]);
  });

  it('parses M/d/yyyy after switching to English', () => {
    adapter.setLocale('en-US');
    expect(ymd(adapter.parse('12/31/2028', null))).toEqual([2028, 12, 31]);
    expect(ymd(adapter.parse('05/03/2027', null))).toEqual([2027, 5, 3]);
  });

  it('rejects a month-first date in Spanish and a day-first date in English', () => {
    expect(adapter.isValid(adapter.parse('12/31/2028', null)!)).toBeFalse();
    adapter.setLocale('en-US');
    expect(adapter.isValid(adapter.parse('31/12/2028', null)!)).toBeFalse();
  });

  it('parses ISO yyyy-MM-dd as a local day in any locale', () => {
    expect(ymd(adapter.parse('2028-12-31', null))).toEqual([2028, 12, 31]);
    adapter.setLocale('en-US');
    const date = adapter.parse('2028-12-31', null)!;
    expect(ymd(date)).toEqual([2028, 12, 31]);
    expect(date.getHours()).toBe(0);
  });

  it('is strict with impossible or malformed dates', () => {
    for (const text of ['31/02/2027', '29/02/2027', '00/01/2027', '10/13/2027', '2027-02-31', 'abc', '1/2/27']) {
      const parsed = adapter.parse(text, null);
      expect(parsed).withContext(text).not.toBeNull();
      expect(adapter.isValid(parsed!)).withContext(text).toBeFalse();
    }
  });

  it('returns null for empty input', () => {
    expect(adapter.parse('', null)).toBeNull();
    expect(adapter.parse('   ', null)).toBeNull();
    expect(adapter.parse(null, null)).toBeNull();
  });

  it('deserializes a date-only string as a local day', () => {
    expect(ymd(adapter.deserialize('1990-07-15'))).toEqual([1990, 7, 15]);
  });

  it('formats the input value following the active locale', () => {
    const date = new Date(2028, 11, 31);
    expect(adapter.format(date, SOFIA_DATE_FORMATS.display.dateInput)).toBe('31/12/2028');
    adapter.setLocale('en-US');
    expect(adapter.format(date, SOFIA_DATE_FORMATS.display.dateInput)).toBe('12/31/2028');
  });

  it('round-trips what it formats in both locales', () => {
    const date = new Date(2027, 2, 5);
    for (const locale of ['es-PE', 'en-US']) {
      adapter.setLocale(locale);
      const text = adapter.format(date, SOFIA_DATE_FORMATS.display.dateInput);
      expect(ymd(adapter.parse(text, null))).withContext(locale).toEqual([2027, 3, 5]);
    }
  });

  it('follows the active Transloco language', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideTranslocoTesting(), { provide: DateAdapter, useClass: SofiaDateAdapter }],
    });
    const synced = TestBed.inject<DateAdapter<Date>>(DateAdapter);
    expect(ymd(synced.parse('05/03/2027', null))).toEqual([2027, 3, 5]);

    TestBed.inject(TranslocoService).setActiveLang('en');

    expect(ymd(synced.parse('05/03/2027', null))).toEqual([2027, 5, 3]);
    expect(synced.format(new Date(2028, 11, 31), SOFIA_DATE_FORMATS.display.dateInput)).toBe('12/31/2028');
  });

  it('maps app languages to date locales', () => {
    expect(dateLocaleForLang('es')).toBe('es-PE');
    expect(dateLocaleForLang('en')).toBe('en-US');
  });
});
