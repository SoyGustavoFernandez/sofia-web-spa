import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { MatDatepickerIntlTransloco } from './mat-datepicker-intl.component';

describe('MatDatepickerIntlTransloco', () => {
  let intl: MatDatepickerIntlTransloco;
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        importProvidersFrom(
          TranslocoTestingModule.forRoot({
            langs: {
              es: { datepicker: { openCalendar: 'Abrir calendario', nextMonth: 'Mes siguiente' } },
              en: { datepicker: { openCalendar: 'Open calendar', nextMonth: 'Next month' } },
            },
            translocoConfig: { availableLangs: ['es', 'en'], defaultLang: 'es' },
            preloadLangs: true,
          }),
        ),
        MatDatepickerIntlTransloco,
      ],
    });
    transloco = TestBed.inject(TranslocoService);
    intl = TestBed.inject(MatDatepickerIntlTransloco);
  });

  it('uses the labels of the default language', () => {
    expect(intl.openCalendarLabel).toBe('Abrir calendario');
    expect(intl.nextMonthLabel).toBe('Mes siguiente');
  });

  it('switches labels and notifies when the language changes', () => {
    let notified = 0;
    intl.changes.subscribe(() => notified++);

    transloco.setActiveLang('en');

    expect(intl.openCalendarLabel).toBe('Open calendar');
    expect(intl.nextMonthLabel).toBe('Next month');
    expect(notified).toBeGreaterThan(0);
  });
});
