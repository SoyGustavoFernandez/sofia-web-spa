import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[cswValidName]',
})
export class ValidNameDirective {
  private regex = /^[a-zA-ZÀ-ÿ\u00f1\u00d10-9\s.,'-]*$/;
  private regexReplace = /[^a-zA-ZÀ-ÿ\u00f1\u00d10-9\s.,'-]/g;

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (
      ['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete'].includes(
        event.key
      )
    ) {
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
