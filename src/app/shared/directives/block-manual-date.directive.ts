import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[blockManualDateInput]',
})
export class BlockManualDateInputDirective {

  constructor(private el: ElementRef<HTMLInputElement>, private renderer: Renderer2) {
    this.renderer.setAttribute(this.el.nativeElement, 'autocomplete', 'off');
  }

  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (['Tab', 'Shift', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent) {
    event.preventDefault();
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault();
  }
}