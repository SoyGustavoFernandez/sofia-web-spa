import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Optional,
  inject,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[cswPositiveInteger]',
})
export class PositiveIntegerDirective implements OnInit, AfterViewInit, OnDestroy {
  private readonly specialKeys: string[] = [
    'Backspace',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Delete',
    'Home',
    'End',
    'Enter',
  ];

  @Input() formatThousands?: boolean = false; // format with comma separators

  private readonly el = inject(ElementRef<HTMLInputElement>);
  @Optional() private readonly ngControl = inject(NgControl, { optional: true, self: true });
  private valueChangesSub?: Subscription;
  private statusChangesSub?: Subscription;
  private isFormatting = false;

  ngOnInit(): void {
    if (this.formatThousands && this.ngControl?.control) {
      this.valueChangesSub = this.ngControl.control.valueChanges.subscribe((value) => {
        if (document.activeElement !== this.el.nativeElement && !this.isFormatting) {
          setTimeout(() => this.formatInputValue(value), 0);
        }
      });

      this.statusChangesSub = this.ngControl.control.statusChanges.subscribe(() => {
        if (this.ngControl?.control?.disabled && this.ngControl?.control?.value != null) {
          setTimeout(() => this.formatInputValue(this.ngControl?.control?.value), 0);
        }
      });
    }
  }

  ngAfterViewInit(): void {
    if (this.formatThousands) {
      setTimeout(() => {
        this.formatInputValue(this.ngControl?.control?.value);
      }, 200);
    }
  }

  ngOnDestroy(): void {
    this.valueChangesSub?.unsubscribe();
    this.statusChangesSub?.unsubscribe();
  }

  private formatInputValue(controlValue?: unknown): void {
    if (this.isFormatting) return;

    const input = this.el.nativeElement;
    const value = controlValue !== undefined ? String(controlValue) : input.value;

    if (value && value !== '' && value !== 'null' && value !== 'undefined') {
      const formatted = this.formatNumberWithThousands(value);
      if (input.value !== formatted) {
        this.isFormatting = true;
        input.value = formatted;
        this.isFormatting = false;
      }
    }
  }

  private formatNumberWithThousands(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';

    const stringValue = String(value).replace(/,/g, '');
    if (stringValue === 'null' || stringValue === 'undefined' || isNaN(Number(stringValue))) {
      return '';
    }

    // Only integer part — no decimal handling needed
    return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private unformatNumber(value: string): string {
    if (!value || value === '') return '';
    return value.replace(/,/g, '');
  }

  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent) {
    if (!this.formatThousands) return;

    const input = event.target as HTMLInputElement;
    const unformatted = this.unformatNumber(input.value);
    if (input.value !== unformatted) {
      input.value = unformatted;
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
    }
  }

  @HostListener('blur', ['$event'])
  onBlur(event: FocusEvent) {
    if (!this.formatThousands) return;

    const input = event.target as HTMLInputElement;
    const cleanValue = this.unformatNumber(input.value);
    const formatted = this.formatNumberWithThousands(cleanValue);

    if (input.value !== formatted) {
      input.value = formatted;
      if (this.ngControl?.control) {
        this.ngControl.control.setValue(cleanValue, { emitEvent: false });
      }
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
    }
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
    }

    // Allow Ctrl/Command shortcuts (copy, paste, cut, select all)
    if (event.ctrlKey || event.metaKey) {
      return;
    }

    if (this.specialKeys.includes(event.key)) {
      return;
    }

    // Ignore dots
    if (event.key === '.') {
      event.preventDefault();
      return;
    }

    // Allow only digits (whole numbers)
    if (/^\d$/.test(event.key)) {
      return;
    }

    // Prevent everything else
    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const pastedInput: string = event.clipboardData?.getData('text') || '';
    // Strip commas to allow pasting formatted numbers (e.g. "1,234")
    const cleaned = pastedInput.replace(/,/g, '');
    if (!/^\d+$/.test(cleaned)) {
      event.preventDefault();
    }
  }
}