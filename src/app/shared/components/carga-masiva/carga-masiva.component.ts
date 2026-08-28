import { Component, inject, input, output, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';

@Component({
  selector: 'sofia-carga-masiva',
  standalone: true,
  imports: [
    TranslocoModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="carga-masiva-container">
      <button
        mat-stroked-button
        [disabled]="uploading()"
        [matTooltip]="'carga-masiva.download-template' | transloco"
        (click)="downloadTemplate()"
      >
        <mat-icon>download</mat-icon>
        {{ 'carga-masiva.download-template' | transloco }}
      </button>

      <button
        mat-stroked-button
        [disabled]="uploading()"
        [matTooltip]="'carga-masiva.upload-file' | transloco"
        (click)="fileInput.click()"
      >
        @if (uploading()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>upload_file</mat-icon>
        }
        {{ 'carga-masiva.upload-file' | transloco }}
      </button>

      <input
        #fileInput
        type="file"
        accept=".xlsx"
        style="display: none"
        (change)="onFileSelected($event)"
      />
    </div>
  `,
  styles: [`
    .carga-masiva-container {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  `],
})
export class CargaMasivaComponent {
  readonly downloadUrl = input.required<string>();
  readonly uploadUrl = input.required<string>();
  readonly uploaded = output<void>();

  readonly uploading = signal(false);

  private readonly http = inject(HttpClient);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  downloadTemplate(): void {
    this.http.get(this.downloadUrl(), { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'plantilla.xlsx';
        anchor.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.notifier.showError(this.transloco.translate('carga-masiva.download-error'));
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    this.uploading.set(true);

    this.http.post(this.uploadUrl(), formData).subscribe({
      next: () => {
        this.uploading.set(false);
        this.notifier.showSuccess(this.transloco.translate('carga-masiva.upload-success'));
        this.uploaded.emit();
      },
      error: () => {
        this.uploading.set(false);
        this.notifier.showError(this.transloco.translate('carga-masiva.upload-error'));
      },
    });
  }
}
