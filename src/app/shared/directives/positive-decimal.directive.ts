import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[cswPositiveDecimal]',
})
export class PositiveDecimalDirective {
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

    // Allow digits
    if (/^\d$/.test(event.key)) {
      return;
    }

    // Allow one dot if not already present
    if (event.key === '.') {
      const input = event.target as HTMLInputElement;
      if (input.value.includes('.')) {
        event.preventDefault();
      }
      return;
    }

    // Prevent everything else
    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const pastedInput: string = event.clipboardData?.getData('text') || '';
    // Only allow positive decimals (e.g. 123, 123.45)
    if (!/^\d+(\.\d+)?$/.test(pastedInput)) {
      event.preventDefault();
    }
  }
}
