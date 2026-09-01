import { Component, input, model } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';

@Component({
  selector: 'app-range-slider-field',
  standalone: true,
  imports: [MatSliderModule],
  template: `
    <div class="sofia-slider-field">
      <span class="sofia-slider-label">
        {{ label() }}: <strong>{{ startValue() }}</strong>{{ unit() }} — <strong>{{ endValue() }}</strong>{{ unit() }}
      </span>
      <mat-slider [min]="min()" [max]="max()" [step]="step()" discrete class="w-100">
        <input matSliderStartThumb [value]="startValue()" (valueChange)="startValue.set($event)" />
        <input matSliderEndThumb [value]="endValue()" (valueChange)="endValue.set($event)" />
      </mat-slider>
    </div>
  `,
})
export class RangeSliderFieldComponent {
  readonly label = input.required<string>();
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly unit = input<string>('');

  readonly startValue = model.required<number>();
  readonly endValue = model.required<number>();
}
