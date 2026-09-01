import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule } from '@jsverse/transloco';

export interface ServerErrorSnackbarData {
  message: string;
  traceId: string;
}

@Component({
  selector: 'app-server-error-snackbar',
  standalone: true,
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, TranslocoModule],
  template: `
    <div class="se-snackbar">
      <mat-icon class="se-snackbar__icon">error_outline</mat-icon>
      <div class="se-snackbar__body">
        <span class="se-snackbar__message">{{ data.message }}</span>
        <span class="se-snackbar__trace">
          {{ 'generic-labels.trace-ref' | transloco }}: <strong>{{ data.traceId }}</strong>
        </span>
      </div>
      <div class="se-snackbar__actions">
        <button mat-icon-button
          [matTooltip]="'generic-labels.copy-ref' | transloco"
          (click)="copy()">
          <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
        </button>
        <button mat-icon-button (click)="dismiss()">
          <mat-icon>close</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .se-snackbar {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 360px;
      max-width: 560px;
    }
    .se-snackbar__icon { color: #f44336; flex-shrink: 0; }
    .se-snackbar__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      overflow: hidden;
    }
    .se-snackbar__message { font-size: 14px; }
    .se-snackbar__trace {
      font-size: 11px;
      opacity: 0.7;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .se-snackbar__actions { display: flex; flex-shrink: 0; }
  `],
})
export class ServerErrorSnackbarComponent {
  readonly data = inject<ServerErrorSnackbarData>(MAT_SNACK_BAR_DATA);
  private readonly ref = inject(MatSnackBarRef);

  copied = false;

  copy(): void {
    navigator.clipboard.writeText(this.data.traceId).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    });
  }

  dismiss(): void {
    this.ref.dismiss();
  }
}
