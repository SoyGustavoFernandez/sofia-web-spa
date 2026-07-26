import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[cswValidDescription]',
})
export class ValidDescriptionDirective {
  private readonly regex = /^[a-zA-Z0-9\s.,'-]*$/;
  private readonly regexReplace = /[^a-zA-Z0-9\s.,'-]/g;

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

  private normalizeAccents(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedInput: string = event.clipboardData?.getData('text') || '';
    const normalized = this.normalizeAccents(pastedInput);
    const filtered = normalized.replace(this.regexReplace, ' ');
    const input = event.target as HTMLInputElement;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
    const current = input.value;
    input.value = current.slice(0, start) + filtered + current.slice(end);
    input.setSelectionRange(start + filtered.length, start + filtered.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const filtered = input.value.replace(this.regexReplace, '');
    if (filtered !== input.value) {
      const start = input.selectionStart ?? filtered.length;
      input.value = filtered;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.setSelectionRange(start, start);
    }
  }
}
