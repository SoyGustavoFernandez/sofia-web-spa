import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[cswNumeric]',
})
export class NumericDirective {
  private regex = /^[0-9]*$/;
  private singleDigit = /^\d$/;
  private nonDigits = /\D/g;

  private specialKeys: string[] = [
    'Backspace',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'Delete',
    'Home',
    'End',
    'Enter',
  ];

  constructor(private el: ElementRef<HTMLInputElement>) { }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (this.specialKeys.includes(event.key) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey) {
      return;
    }

    if (!this.singleDigit.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const pasted = event.clipboardData?.getData('text') ?? '';
    const isNumeric = /^\d+$/.test(pasted);

    if (!isNumeric) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    const input = this.el.nativeElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    const before = input.value.slice(0, start);
    const after = input.value.slice(end);
    const maxLength = input.maxLength > 0 ? input.maxLength : Infinity;

    const allowedLength = maxLength - (before.length + after.length);
    const toInsert = pasted.slice(0, Math.max(0, allowedLength));

    input.value = before + toInsert + after;
    input.setSelectionRange(before.length + toInsert.length, before.length + toInsert.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  @HostListener('input')
  onInput() {
    const input = this.el.nativeElement;
    const cleaned = input.value.replace(this.nonDigits, '');
    const maxLength = input.maxLength > 0 ? input.maxLength : Infinity;

    let final = cleaned;
    if (cleaned.length > maxLength) {
      final = cleaned.slice(0, maxLength);
    }

    if (input.value !== final) {
      input.value = final;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}
