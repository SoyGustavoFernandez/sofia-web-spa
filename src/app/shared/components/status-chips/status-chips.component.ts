import { Component, input } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';

export interface StatusStep<T = string> {
  value: T;
  label: string;
  color?: string;
}

@Component({
  selector: 'sofia-status-chips',
  standalone: true,
  imports: [MatChipsModule],
  template: `
    <mat-chip-set>
      @for (step of steps(); track step.value) {
        <mat-chip
          [class.current-status]="step.value === current()"
          [style.backgroundColor]="step.value === current() ? (step.color ?? '#0057dd') : null"
        >
          {{ step.label }}
        </mat-chip>
      }
    </mat-chip-set>
  `,
  styles: [`
    :host { display: block; }
    mat-chip-set { display: flex; flex-wrap: wrap; gap: 8px; }
  `],
})
export class StatusChipsComponent<T = string> {
  readonly steps = input.required<StatusStep<T>[]>();
  readonly current = input.required<T>();
}
