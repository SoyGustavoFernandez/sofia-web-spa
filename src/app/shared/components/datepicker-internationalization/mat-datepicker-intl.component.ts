import { inject, Injectable } from '@angular/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { TranslocoService } from '@jsverse/transloco';

type DatepickerLabel =
  | 'calendarLabel'
  | 'openCalendarLabel'
  | 'closeCalendarLabel'
  | 'prevMonthLabel'
  | 'nextMonthLabel'
  | 'prevYearLabel'
  | 'nextYearLabel'
  | 'prevMultiYearLabel'
  | 'nextMultiYearLabel'
  | 'switchToMonthViewLabel'
  | 'switchToMultiYearViewLabel';

const LABEL_KEYS: Record<DatepickerLabel, string> = {
  calendarLabel: 'datepicker.calendar',
  openCalendarLabel: 'datepicker.openCalendar',
  closeCalendarLabel: 'datepicker.closeCalendar',
  prevMonthLabel: 'datepicker.prevMonth',
  nextMonthLabel: 'datepicker.nextMonth',
  prevYearLabel: 'datepicker.prevYear',
  nextYearLabel: 'datepicker.nextYear',
  prevMultiYearLabel: 'datepicker.prevMultiYear',
  nextMultiYearLabel: 'datepicker.nextMultiYear',
  switchToMonthViewLabel: 'datepicker.switchToMonthView',
  switchToMultiYearViewLabel: 'datepicker.switchToMultiYearView',
};

@Injectable()
export class MatDatepickerIntlTransloco extends MatDatepickerIntl {
  private readonly translocoService = inject(TranslocoService);

  constructor() {
    super();
    this.translocoService.langChanges$.subscribe(() => this.getAndSetLabels());
  }

  getAndSetLabels(): void {
    (Object.keys(LABEL_KEYS) as DatepickerLabel[]).forEach(label => {
      this.translocoService.selectTranslate<string>(LABEL_KEYS[label]).subscribe(text => {
        this[label] = text;
        this.changes.next();
      });
    });
  }
}
