import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[cswAlphanumeric]',
})
export class AlphanumericDirective {
  private regex = /^[a-zA-Z0-9]*$/;
  private regexReplace = /[^a-zA-Z0-9]/g;

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

    if (this.specialKeys.includes(event.key)) {
      return;
    }

    if (!this.regex.test(event.key)) {
      event.preventDefault();
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    const pastedInput: string = event.clipboardData?.getData('text') || '';

    if (!this.regex.test(pastedInput)) {
      event.preventDefault();

      const filtered = pastedInput.replace(this.regexReplace, '');
      if (filtered.length > 0) {
        const input = event.target as HTMLInputElement;
        const start = input.selectionStart ?? 0;
        const end = input.selectionEnd ?? 0;

        input.setRangeText(filtered, start, end, 'end');
      }
    }
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const filtered = input.value.replace(this.regexReplace, '');
    if (filtered !== input.value) {
      const start = input.selectionStart ?? filtered.length;
      input.value = filtered;
      // Notificar al binding de Angular
      input.dispatchEvent(new Event('input', { bubbles: true }));
      // Mantener posición del cursor
      input.setSelectionRange(start, start);
    }
  }
}
