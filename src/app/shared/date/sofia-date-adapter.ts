import { Injectable, inject } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';
import { TranslocoService } from '@jsverse/transloco';
import { buildLocalDate } from '@shared/utils/date-only.util';

const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const TYPED_DATE = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;

export const SOFIA_DEFAULT_DATE_LOCALE = 'es-PE';

export const SOFIA_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: null, timeInput: null },
  display: {
    dateInput: { year: 'numeric', month: '2-digit', day: '2-digit' },
    timeInput: { hour: 'numeric', minute: 'numeric' },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
    timeOptionLabel: { hour: 'numeric', minute: 'numeric' },
  },
};

export function dateLocaleForLang(lang: string): string {
  return lang.toLowerCase().startsWith('es') ? SOFIA_DEFAULT_DATE_LOCALE : 'en-US';
}

// Parses typed dates as d/M/yyyy in Spanish and M/d/yyyy otherwise, and follows the active app language
@Injectable()
export class SofiaDateAdapter extends NativeDateAdapter {
  constructor() {
    super();
    const transloco = inject(TranslocoService, { optional: true });
    transloco?.langChanges$.subscribe(lang => this.setLocale(dateLocaleForLang(lang)));
  }

  override parse(value: unknown): Date | null {
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'number') return new Date(value);
    if (typeof value !== 'string') return null;
    const text = value.trim();
    if (!text) return null;
    return this.parseText(text) ?? this.invalid();
  }

  override deserialize(value: unknown): Date | null {
    if (typeof value === 'string' && ISO_DATE.test(value.trim())) {
      return this.parseText(value.trim()) ?? this.invalid();
    }
    return super.deserialize(value);
  }

  private parseText(text: string): Date | null {
    const iso = ISO_DATE.exec(text);
    if (iso) return buildLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const typed = TYPED_DATE.exec(text);
    if (!typed) return null;
    const first = Number(typed[1]);
    const second = Number(typed[2]);
    const dayFirst = String(this.locale ?? '').toLowerCase().startsWith('es');
    return buildLocalDate(Number(typed[3]), dayFirst ? second : first, dayFirst ? first : second);
  }
}
