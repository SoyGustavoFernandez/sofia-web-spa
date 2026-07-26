import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appDecimalPrecision]',
  standalone: true
})
export class DecimalPrecisionDirective {
  @Input() decimals = 2;

  constructor(private el: ElementRef) {}

  @HostListener('blur') onBlur() {
    if (this.el.nativeElement.value) {
      const val = parseFloat(this.el.nativeElement.value);
      if (!isNaN(val)) {
        this.el.nativeElement.value = val.toFixed(this.decimals);
      }
    }
  }
}
