import { registerLocaleData } from '@angular/common';
import localeEsPe from '@angular/common/locales/es-PE';
import { Provider } from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { MatDatepickerIntlTransloco } from '@shared/components/datepicker-internationalization/mat-datepicker-intl.component';
import { SOFIA_DATE_FORMATS, SOFIA_DEFAULT_DATE_LOCALE, SofiaDateAdapter } from './sofia-date-adapter';

// Also listed in MaterialModule: Material modules re-provide these per standalone component injector
export const SOFIA_DATE_PROVIDERS: Provider[] = [
  { provide: MAT_DATE_LOCALE, useValue: SOFIA_DEFAULT_DATE_LOCALE },
  { provide: DateAdapter, useClass: SofiaDateAdapter },
  { provide: MAT_DATE_FORMATS, useValue: SOFIA_DATE_FORMATS },
  { provide: MatDatepickerIntl, useClass: MatDatepickerIntlTransloco },
];

// App-wide date setup: Spanish locale data, locale-aware adapter and translated datepicker
export function provideSofiaDates(): Provider[] {
  registerLocaleData(localeEsPe);
  return SOFIA_DATE_PROVIDERS;
}
