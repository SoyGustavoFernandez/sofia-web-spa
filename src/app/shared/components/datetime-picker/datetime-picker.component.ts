import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnInit,
  ViewEncapsulation,
  forwardRef,
  HostListener,
  inject,
  ElementRef,
  Renderer2,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import {
  ReactiveFormsModule,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormGroupDirective,
  NgForm,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { TimezoneService } from '@core/services/shared/timezone.service';
import { effect } from '@angular/core';

@Component({
  selector: 'csw-datetime-picker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatNativeDateModule,
    MatCardModule,
  ],
  templateUrl: './datetime-picker.component.html',
  styleUrls: ['./datetime-picker.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatetimePickerComponent),
      multi: true,
    },
  ],
})
export class DatetimePickerComponent implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() placeholder = '';
  @Input() disabled = false;
  /** Solo para accesibilidad */
  @Input() required = false;
  /** 
   * Zona horaria IANA (opcional, si no se proporciona usa TimezoneService)
   * Si se proporciona, sobrescribe el valor del servicio
   */
  @Input() timezone?: string;

  @Output() dateTimeChange = new EventEmitter<Date | null>();

  private static openPicker: DatetimePickerComponent | null = null;

  // NO inyectamos NgControl para evitar NG0200.
  private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly parentForm = inject(FormGroupDirective, { optional: true });
  private readonly parentNgForm = inject(NgForm, { optional: true });
  private readonly timezoneService = inject(TimezoneService);

  // Signal para la zona horaria (usa el servicio o el @Input si se proporciona)
  private readonly timezoneSignal = signal<string>('America/Lima');
  currentDate = signal<Date>(new Date());
  selectedDate = signal<Date | null>(null);
  selectedHour = signal<number>(0);
  selectedMinute = signal<number>(0);
  isAM = signal<boolean>(true);
  isPickerOpen = false;
  showMonthPicker = false;
  isDefaultDateSelected = false;
  isDateSelected = false;

  hourDisplayValue = '';
  minuteDisplayValue = '';

  // Computed signal para obtener la fecha actual en la zona horaria especificada
  currentDateInTimezone = computed(() => {
    const tz = this.timezoneSignal();
    const now = new Date();
    return toZonedTime(now, tz);
  });

  private readonly renderer = inject(Renderer2);
  private pickerElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;

  // ControlValueAccessor
  onChange: (value: Date | null) => void = () => {
    /**/
  };
  onTouched: () => void = () => {
    /**/
  };

  constructor() {
    // Effect para reaccionar a cambios en el servicio de zona horaria
    effect(() => {
      const serviceTimezone = this.timezoneService.timezone();
      // Solo actualizar si no hay un @Input que sobrescriba
      if (!this.timezone) {
        this.timezoneSignal.set(serviceTimezone);
        // Si hay una fecha seleccionada, actualizar su visualización
        if (this.selectedDate()) {
          this.generateCalendar();
        }
      }
    });
  }

  ngOnInit() {
    // Inicializar la zona horaria: prioridad al @Input, luego al servicio
    if (this.timezone) {
      this.timezoneSignal.set(this.timezone);
    } else {
      this.timezoneSignal.set(this.timezoneService.getTimezone());
    }
    
    // Inicializar con la fecha actual en la zona horaria especificada
    const nowInTz = this.currentDateInTimezone();
    this.currentDate.set(nowInTz);
    this.selectedDate.set(null);
    this.selectedHour.set(nowInTz.getHours());
    this.selectedMinute.set(nowInTz.getMinutes());
    this.isAM.set(nowInTz.getHours() < 12);
    this.isDefaultDateSelected = false;
    this.hourDisplayValue = '';
    this.minuteDisplayValue = '';
    this.generateCalendar();
  }

  ngOnDestroy() {
    this.removePickerFromBody();
  }

  // ===== CVA =====
  writeValue(value: Date | null): void {
    if (value) {
      // El valor viene en UTC, convertirlo a la zona horaria especificada para mostrar
      const tz = this.timezoneSignal();
      const dateInTz = toZonedTime(value, tz);
      
      this.selectedDate.set(dateInTz);
      this.selectedHour.set(dateInTz.getHours());
      this.selectedMinute.set(dateInTz.getMinutes());
      this.currentDate.set(new Date(dateInTz));
      this.isAM.set(dateInTz.getHours() < 12);
      this.isDefaultDateSelected = false;
    } else {
      this.selectedDate.set(null);
      this.selectedHour.set(0);
      this.selectedMinute.set(0);
      this.isAM.set(true);
      const nowInTz = this.currentDateInTimezone();
      this.currentDate.set(nowInTz);
      this.isDefaultDateSelected = false;
    }
    this.generateCalendar();
  }
  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /** Borde rojo (mismo criterio que Material): invalid && (touched || dirty || submitted) */
  get invalid(): boolean {
    const host = this.hostEl.nativeElement;
    const isInvalid = host.classList.contains('ng-invalid');
    const touchedOrDirty =
      host.classList.contains('ng-touched') ||
      host.classList.contains('ng-dirty');
    const submitted = !!(
      this.parentForm?.submitted || this.parentNgForm?.submitted
    );
    return isInvalid && (touchedOrDirty || submitted);
  }

  onDisplayBlur() {
    this.onTouched();
  }

  // ===== UI / Lógica =====

  get hourDisplay(): string {
    return (
      this.hourDisplayValue || this.selectedHour().toString().padStart(2, '0')
    );
  }
  set hourDisplay(value: string) {
    this.hourDisplayValue = value;
  }

  get minuteDisplay(): string {
    return (
      this.minuteDisplayValue || this.selectedMinute().toString().padStart(2, '0')
    );
  }
  set minuteDisplay(value: string) {
    this.minuteDisplayValue = value;
  }

  weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  months = [
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  calendarDays: CalendarDay[] = [];

  generateCalendar() {
    const currentDateValue = this.currentDate();
    const year = currentDateValue.getFullYear();
    const month = currentDateValue.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayWeek = firstDay.getDay();

    this.calendarDays = [];

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = firstDayWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay.getDate() - i;
      this.calendarDays.push({
        day,
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let day = 1; day <= lastDay.getDate(); day++) {
      this.calendarDays.push({
        day,
        date: new Date(year, month, day),
        isCurrentMonth: true,
      });
    }

    // Next month days - only fill to complete the grid
    const totalDays = this.calendarDays.length;
    const remainingCells = totalDays <= 35 ? 35 - totalDays : 42 - totalDays;
    for (let day = 1; day <= remainingCells; day++) {
      this.calendarDays.push({
        day,
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
      });
    }
  }

  togglePicker() {
    if (this.disabled) return;

    const open = !this.isPickerOpen;
    this.isPickerOpen = open;

    // Close any other open picker
    if (open) {
      if (DatetimePickerComponent.openPicker && DatetimePickerComponent.openPicker !== this) {
        DatetimePickerComponent.openPicker.closePicker();
      }
      DatetimePickerComponent.openPicker = this;

      // Wait for Angular to render the picker-overlay
      setTimeout(() => {
        this.createAndPositionPicker();
      }, 0);
    } else {
      if (DatetimePickerComponent.openPicker === this) {
        DatetimePickerComponent.openPicker = null;
      }
      this.removePickerFromBody();
    }
  }

  closePicker() {
    this.isPickerOpen = false;
    this.removePickerFromBody();
    this.onTouched();
    if (DatetimePickerComponent.openPicker === this) {
      DatetimePickerComponent.openPicker = null;
    }
  }

  confirmSelection() {
    this.updateDateTime();
    this.closePicker();
  }

  private createAndPositionPicker() {
    // Find the picker content from the current component
    const localPickerOverlay = this.hostEl.nativeElement.querySelector('.picker-overlay');
    const pickerPopup = localPickerOverlay?.querySelector('.picker-popup');

    if (!pickerPopup) return;

    // Create a new overlay that will be attached to body
    this.overlayElement = this.renderer.createElement('div');
    this.renderer.addClass(this.overlayElement, 'picker-overlay-portal');
    this.renderer.setStyle(this.overlayElement, 'position', 'fixed');
    this.renderer.setStyle(this.overlayElement, 'z-index', '10000');
    this.renderer.setStyle(this.overlayElement, 'pointer-events', 'auto');

    // Clone the picker popup
    this.pickerElement = pickerPopup.cloneNode(true) as HTMLElement;
    this.renderer.appendChild(this.overlayElement, this.pickerElement);
    this.renderer.appendChild(document.body, this.overlayElement);

    // Hide the original picker
    this.renderer.setStyle(localPickerOverlay, 'display', 'none');

    // Position the picker
    this.positionPicker();

    // Bind events to the cloned picker
    this.bindPickerEvents();
  }

  private positionPicker() {
    if (!this.overlayElement) return;

    const inputElement = this.hostEl.nativeElement.querySelector('.mat-mdc-form-field');
    if (!inputElement) return;

    const rect = inputElement.getBoundingClientRect();
    const pickerRect = this.overlayElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position below the input
    let top = rect.bottom + 4;
    let left = rect.left;

    // Adjust horizontal position if off-screen
    if (left + pickerRect.width > viewportWidth) {
      left = Math.max(8, viewportWidth - pickerRect.width - 8);
    }

    // Adjust vertical position if off-screen
    if (top + pickerRect.height > viewportHeight) {
      const spaceAbove = rect.top;
      const spaceBelow = viewportHeight - rect.bottom;

      if (spaceAbove > spaceBelow && spaceAbove > pickerRect.height) {
        top = rect.top - pickerRect.height - 4;
      }
    }

    this.renderer.setStyle(this.overlayElement, 'top', `${top}px`);
    this.renderer.setStyle(this.overlayElement, 'left', `${left}px`);
  }

  private bindPickerEvents() {
    if (!this.pickerElement) return;

    // Bind all click events
    const buttons = this.pickerElement.querySelectorAll('button');
    buttons.forEach((button) => {
      this.renderer.listen(button, 'click', (event) => {
        event.preventDefault();
        event.stopPropagation();

        const className = button.className;
        const iconText = button.querySelector('mat-icon')?.textContent;

        // Handle different button types
        if (className.includes('month-nav-button')) {
          if (iconText === 'chevron_left') {
            this.previousMonth();
          } else if (iconText === 'chevron_right') {
            this.nextMonth();
          }
        } else if (className.includes('month-year-button')) {
          this.toggleMonthPicker();
        } else if (className.includes('month-button')) {
          const monthIndex = Array.from(button.parentElement!.children).indexOf(button);
          this.selectMonth(monthIndex);
        } else if (className.includes('calendar-day')) {
          // Get the index of this button in the calendar
          const allDayButtons = this.pickerElement!.querySelectorAll('.calendar-day');
          const dayIndex = Array.from(allDayButtons).indexOf(button);

          if (dayIndex >= 0 && dayIndex < this.calendarDays.length) {
            const calendarDay = this.calendarDays[dayIndex];
            // Only select if it's a current month day
            if (calendarDay.isCurrentMonth) {
              this.selectDate(calendarDay.date);
            }
          }
        } else if (className.includes('spinner-btn')) {
          if (iconText === 'keyboard_arrow_up') {
            const parent = button.closest('.time-spinner-container');
            if (parent?.closest('.time-control')?.previousElementSibling?.classList.contains('time-separator')) {
              this.incrementMinute();
            } else {
              this.incrementHour();
            }
          } else if (iconText === 'keyboard_arrow_down') {
            const parent = button.closest('.time-spinner-container');
            if (parent?.closest('.time-control')?.previousElementSibling?.classList.contains('time-separator')) {
              this.decrementMinute();
            } else {
              this.decrementHour();
            }
          }
        } else if (className.includes('confirm-btn-square')) {
          if (iconText === 'check') {
            this.confirmSelection();
          } else if (iconText === 'delete') {
            this.clearSelection();
          }
        } else if (className.includes('year-nav-button')) {
          if (iconText === 'chevron_left') {
            this.previousYear();
          } else if (iconText === 'chevron_right') {
            this.nextYear();
          }
        }

        // Update the cloned picker content
        setTimeout(() => this.updatePickerContent(), 0);
      });
    });

    // Bind input events
    const inputs = this.pickerElement.querySelectorAll('input');
    inputs.forEach((input, index) => {
      this.renderer.listen(input, 'input', (event) => {
        if (index === 0) { // Hour input
          this.onHourTextChange(event);
          this.onHourInput(event);
        } else { // Minute input
          this.onMinuteTextChange(event);
          this.onMinuteInput(event);
        }
      });

      this.renderer.listen(input, 'blur', () => {
        if (index === 0) {
          this.onHourBlur();
        } else {
          this.onMinuteBlur();
        }
        setTimeout(() => this.updatePickerContent(), 0);
      });

      this.renderer.listen(input, 'focus', (event) => {
        if (index === 0) {
          this.onHourFocus(event);
        } else {
          this.onMinuteFocus(event);
        }
      });
    });
  }

  private updatePickerContent() {
    if (!this.pickerElement) return;

    // Remove old picker and create new one
    this.removePickerFromBody();
    setTimeout(() => this.createAndPositionPicker(), 0);
  }

  private removePickerFromBody() {
    if (this.overlayElement?.parentNode) {
      this.renderer.removeChild(document.body, this.overlayElement);
      this.overlayElement = null;
      this.pickerElement = null;
    }

    // Show the original picker again
    const localPickerOverlay = this.hostEl.nativeElement.querySelector('.picker-overlay');
    if (localPickerOverlay) {
      this.renderer.setStyle(localPickerOverlay, 'display', 'block');
    }
  }

  @HostListener('window:scroll')
  @HostListener('window:resize')
  onWindowScrollOrResize() {
    if (this.isPickerOpen) {
      this.positionPicker();
    }
  }

  /** Cerrar al click/tap fuera del popup o del input gatillo */
  @HostListener('document:pointerdown', ['$event'])
  onAnyPointerDown(ev: PointerEvent) {
    if (!this.isPickerOpen) return;

    const target = ev.target as HTMLElement | null;
    if (!target) return;

    const insidePopup = target.closest('.picker-popup') || target.closest('.picker-overlay-portal');
    const insideTrigger = target.closest('.datetime-input');

    if (!insidePopup && !insideTrigger) {
      this.closePicker();
    }
  }

  selectDate(date: Date) {
    if (this.disabled) return;

    // Crear una nueva fecha con la fecha seleccionada y la hora actual
    const selectedDateValue = new Date(date);
    selectedDateValue.setHours(this.selectedHour());
    selectedDateValue.setMinutes(this.selectedMinute());
    selectedDateValue.setSeconds(0);
    selectedDateValue.setMilliseconds(0);

    this.selectedDate.set(selectedDateValue);
    this.isDefaultDateSelected = false;
    this.isDateSelected = true;

    this.updateDateTime();
  }

  updateDateTime() {
    const selectedDateValue = this.selectedDate();
    if (selectedDateValue) {
      // Asegurar que la fecha tenga la hora y minutos correctos
      const dateWithTime = new Date(selectedDateValue);
      dateWithTime.setHours(this.selectedHour());
      dateWithTime.setMinutes(this.selectedMinute());
      dateWithTime.setSeconds(0);
      dateWithTime.setMilliseconds(0);

      // Convertir de la zona horaria especificada a UTC para enviar al backend
      const tz = this.timezoneSignal();
      const utcDate = fromZonedTime(dateWithTime, tz);

      this.onChange(utcDate);
      this.dateTimeChange.emit(utcDate);
    }
  }

  isSelectedDate(date: Date): boolean {
    const selectedDateValue = this.selectedDate();
    if (!selectedDateValue) return false;
    if (this.isDefaultDateSelected) return false;

    // Compare year, month, and day separately
    return (
      date.getFullYear() === selectedDateValue.getFullYear() &&
      date.getMonth() === selectedDateValue.getMonth() &&
      date.getDate() === selectedDateValue.getDate()
    );
  }

  isDefaultSelectedDate(date: Date): boolean {
    const selectedDateValue = this.selectedDate();
    if (!selectedDateValue || !this.isDefaultDateSelected) return false;

    return (
      date.getFullYear() === selectedDateValue.getFullYear() &&
      date.getMonth() === selectedDateValue.getMonth() &&
      date.getDate() === selectedDateValue.getDate()
    );
  }

  isTodayDate(date: Date): boolean {
    const today = this.currentDateInTimezone();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  previousMonth() {
    const currentDateValue = this.currentDate();
    this.currentDate.set(new Date(
      currentDateValue.getFullYear(),
      currentDateValue.getMonth() - 1,
      1
    ));
    this.generateCalendar();
  }

  nextMonth() {
    const currentDateValue = this.currentDate();
    this.currentDate.set(new Date(
      currentDateValue.getFullYear(),
      currentDateValue.getMonth() + 1,
      1
    ));
    this.generateCalendar();
  }

  getMonthYearDisplay(): string {
    const currentDateValue = this.currentDate();
    const month = this.months[currentDateValue.getMonth()];
    const year = currentDateValue.getFullYear();
    return `${month} ${year}`;
  }

  getFormattedDateTime(): string {
    const selectedDateValue = this.selectedDate();
    if (!selectedDateValue) return '';
    
    const tz = this.timezoneSignal();
    const dateStr = format(selectedDateValue, 'dd/MM/yyyy', { timeZone: tz });
    const hours = this.selectedHour().toString().padStart(2, '0');
    const minutes = this.selectedMinute().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
  }

  getDisplayValue(): string {
    const selectedDateValue = this.selectedDate();
    if (!selectedDateValue) return '';
    
    const tz = this.timezoneSignal();
    const day = format(selectedDateValue, 'dd', { timeZone: tz });
    const month = format(selectedDateValue, 'MM', { timeZone: tz });
    const year = format(selectedDateValue, 'yyyy', { timeZone: tz });
    const hours = this.selectedHour().toString().padStart(2, '0');
    const minutes = this.selectedMinute().toString().padStart(2, '0');
    this.isDateSelected = true;
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  getFormattedTime(): string {
    let displayHour = this.selectedHour();
    if (displayHour === 0) displayHour = 12;
    else if (displayHour > 12) displayHour = displayHour - 12;

    const minutes = this.selectedMinute().toString().padStart(2, '0');
    const period = this.isAM() ? 'AM' : 'PM';
    return `${displayHour.toString().padStart(2, '0')}:${minutes} ${period}`;
  }

  getDisplayHour(): number {
    const hour = this.selectedHour();
    if (hour === 0) return 12;
    else if (hour > 12) return hour - 12;
    return hour;
  }

  selectToday() {
    const today = this.currentDateInTimezone();
    this.selectDate(today);
  }

  clearSelection() {
    this.selectedDate.set(null);
    this.isDefaultDateSelected = false;
    this.isDateSelected = false;
    this.onChange(null);
    this.dateTimeChange.emit(null);
  }

  incrementHour() {
    this.selectedHour.set((this.selectedHour() + 1) % 24);
    this.updateAMPM();

    if (this.selectedDate()) {
      this.isDateSelected = true;
      this.updateDateTime();
    }
  }
  decrementHour() {
    this.selectedHour.set(this.selectedHour() === 0 ? 23 : this.selectedHour() - 1);
    this.updateAMPM();

    if (this.selectedDate()) {
      this.isDateSelected = true;
      this.updateDateTime();
    }
  }
  incrementMinute() {
    this.selectedMinute.set((this.selectedMinute() + 1) % 60);

    if (this.selectedDate()) {
      this.isDateSelected = true;
      this.updateDateTime();
    }
  }
  decrementMinute() {
    this.selectedMinute.set(
      this.selectedMinute() === 0 ? 59 : this.selectedMinute() - 1
    );

    if (this.selectedDate()) {
      this.isDateSelected = true;
      this.updateDateTime();
    }
  }

  onHourChange(value: number) {
    if (value < 0) this.selectedHour.set(0);
    else if (value > 23) this.selectedHour.set(23);
    else if (isNaN(value)) this.selectedHour.set(0);
    else this.selectedHour.set(Math.floor(value));
    this.updateAMPM();
  }
  onMinuteChange(value: number) {
    if (value < 0) this.selectedMinute.set(0);
    else if (value > 59) this.selectedMinute.set(59);
    else if (isNaN(value)) this.selectedMinute.set(0);
    else this.selectedMinute.set(Math.floor(value));
  }

  private validateTimeInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value = target.value;
    value = value.replace(/\D/g, '');
    if (value.length > 2) value = value.slice(0, 2);
    target.value = value;
  }

  onHourInput(event: Event) {
    this.validateTimeInput(event);
  }
  onMinuteInput(event: Event) {
    this.validateTimeInput(event);
  }

  onHourBlur() {
    const hourValue = parseInt(
      this.hourDisplayValue || this.selectedHour().toString()
    );
    if (isNaN(hourValue) || hourValue < 0 || hourValue > 23)
      this.selectedHour.set(0);
    else this.selectedHour.set(hourValue);
    this.hourDisplayValue = '';
    this.updateAMPM();
  }

  onMinuteBlur() {
    const minuteValue = parseInt(
      this.minuteDisplayValue || this.selectedMinute().toString()
    );
    if (isNaN(minuteValue) || minuteValue < 0 || minuteValue > 59)
      this.selectedMinute.set(0);
    else this.selectedMinute.set(minuteValue);
    this.minuteDisplayValue = '';
  }

  onHourTextChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (input?.value !== undefined) {
      this.hourDisplayValue = input.value;
      const numValue = parseInt(input.value);
      if (!isNaN(numValue)) this.selectedHour.set(numValue);
    }
  }

  onMinuteTextChange(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (input?.value !== undefined) {
      this.minuteDisplayValue = input.value;
      const numValue = parseInt(input.value);
      if (!isNaN(numValue)) this.selectedMinute.set(numValue);
    }
  }

  onHourFocus(event: Event) {
    const target = event.target as HTMLInputElement;
    this.hourDisplayValue = this.selectedHour().toString();
    target.select();
  }

  onMinuteFocus(event: Event) {
    const target = event.target as HTMLInputElement;
    this.minuteDisplayValue = this.selectedMinute().toString();
    target.select();
  }

  toggleAMPM() {
    this.isAM.set(!this.isAM());
    const currentHour = this.selectedHour();
    if (this.isAM() && currentHour >= 12) this.selectedHour.set(currentHour - 12);
    else if (!this.isAM() && currentHour < 12) this.selectedHour.set(currentHour + 12);
  }
  private updateAMPM() {
    this.isAM.set(this.selectedHour() < 12);
  }

  toggleMonthPicker() {
    this.showMonthPicker = !this.showMonthPicker;
  }

  selectMonth(monthIndex: number) {
    const currentDateValue = this.currentDate();
    this.currentDate.set(new Date(currentDateValue.getFullYear(), monthIndex, 1));
    this.generateCalendar();
    this.showMonthPicker = false;
  }

  previousYear() {
    const currentDateValue = this.currentDate();
    this.currentDate.set(new Date(
      currentDateValue.getFullYear() - 1,
      currentDateValue.getMonth(),
      1
    ));
  }

  nextYear() {
    const currentDateValue = this.currentDate();
    this.currentDate.set(new Date(
      currentDateValue.getFullYear() + 1,
      currentDateValue.getMonth(),
      1
    ));
  }

  openTimeEditor() {
    const timeString = prompt(
      'Enter time (HH:MM AM/PM):',
      this.getFormattedTime()
    );
    if (timeString) this.parseTimeString(timeString);
  }

  private parseTimeString(timeString: string) {
    const timeRegex = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;
    const match = timeRegex.exec(timeString);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'AM' && hours === 12) hours = 0;
      else if (period === 'PM' && hours !== 12) hours += 12;
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        this.selectedHour.set(hours);
        this.selectedMinute.set(minutes);
        this.isAM.set(hours < 12);
        this.updateDateTime();
      }
    }
  }
}

interface CalendarDay {
  day: number;
  date: Date;
  isCurrentMonth: boolean;
}
