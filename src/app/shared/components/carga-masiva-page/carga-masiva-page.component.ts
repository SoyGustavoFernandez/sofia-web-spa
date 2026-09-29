import { Component, input, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { CargaMasivaConfig, PreviewResult, PreviewRowResult, SaveResult, ValidationError } from '@shared/models/carga-masiva.model';

// Mirrors backend ImportLimits (upload/body size and row cap)
export const MAX_UPLOAD_MB = 5;
export const MAX_IMPORT_ROWS = 5000;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const CARGA_MASIVA_ERROR_KEYS: Record<string, string> = {
  'CargaMasiva.Archivo.Invalido': 'carga-masiva.errors.invalid-file',
  'CargaMasiva.Archivo.ExcedeDescompresion': 'carga-masiva.errors.decompression',
  'CargaMasiva.Filas.Excedidas': 'carga-masiva.errors.too-many-rows',
  'Request.TooLarge': 'carga-masiva.errors.too-large',
};

// Maps upload/bulk-load rejections to i18n keys; validator codes look like "CargaMasivaXCommand.Rows[0].Campo"
export function cargaMasivaErrorKey(err: unknown): string | undefined {
  if (!(err instanceof HttpErrorResponse)) return undefined;
  if (err.status === 413) return 'carga-masiva.errors.too-large';
  const code: unknown = err.error?.code;
  if (typeof code !== 'string') return undefined;
  if (CARGA_MASIVA_ERROR_KEYS[code]) return CARGA_MASIVA_ERROR_KEYS[code];
  if (/^CargaMasiva\w+Command\.Rows$/.test(code)) return 'carga-masiva.errors.too-many-rows';
  if (/^CargaMasiva\w+Command\.Rows\[/.test(code)) return 'carga-masiva.errors.invalid-rows';
  return undefined;
}

@Component({
  selector: 'app-carga-masiva-page',
  templateUrl: './carga-masiva-page.component.html',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class CargaMasivaPageComponent {
  // Required configuration input provided by the entity wrapper component
  readonly config = input.required<CargaMasivaConfig>();

  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly isDragging = signal(false);
  readonly loadingPreview = signal(false);
  readonly saving = signal(false);
  readonly preview = signal<PreviewResult | null>(null);
  readonly limits = { maxMb: MAX_UPLOAD_MB, maxRows: MAX_IMPORT_ROWS };

  // csw-page-header renders title verbatim; selectTranslate waits for the root bundle to load.
  readonly title = toSignal(this.transloco.selectTranslate('carga-masiva.title'), {
    initialValue: '',
  });

  // Rows that passed backend validation
  readonly validRows = computed(() =>
    this.preview()?.rows.filter((r: PreviewRowResult) => r.isValid) ?? [],
  );

  // Data columns + errors list + status icon (rightmost)
  readonly displayedColumns = computed(() => [
    ...this.config().columns.map(c => c.key),
    'errors',
    'status',
  ]);

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(): void {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  private processFile(file: File): void {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.notifier.showError(this.transloco.translate('carga-masiva.errors.invalid-file'));
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      this.notifier.showError(this.transloco.translate('carga-masiva.errors.too-large', this.limits));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    this.loadingPreview.set(true);
    this.preview.set(null);
    this.http.post<PreviewResult>(this.config().previewUrl, formData).subscribe({
      next: result => {
        this.preview.set(result);
        this.loadingPreview.set(false);
      },
      error: (err) => {
        this.loadingPreview.set(false);
        this.showUploadError(err, 'carga-masiva.preview-error');
      },
    });
  }

  // Fetched via HttpClient so the auth interceptor attaches the Bearer token (window.open cannot).
  downloadTemplate(): void {
    const entity = this.config().backRoute.replace(/^\//, '');
    this.http.get(this.config().downloadUrl, { responseType: 'blob' }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('carga-masiva.template-filename', { entity });
        a.click();
        URL.revokeObjectURL(url);
      },
      error: err => this.notifier.showServerError(err, this.transloco.translate('carga-masiva.download-error')),
    });
  }

  saveValid(): void {
    const valid = this.validRows();
    if (!valid.length) {
      this.notifier.showError(this.transloco.translate('carga-masiva.no-valid-rows'));
      return;
    }
    this.saving.set(true);
    const payload = valid.map((r: PreviewRowResult) => r.data);
    this.http.post<SaveResult>(this.config().saveUrl, payload).subscribe({
      next: res => {
        this.saving.set(false);
        this.notifier.showSuccess(
          this.transloco.translate('carga-masiva.save-success', { count: res.savedCount }),
        );
        this.router.navigate([this.config().backRoute]);
      },
      error: (err) => {
        this.saving.set(false);
        this.showUploadError(err, 'carga-masiva.save-error');
      },
    });
  }

  private showUploadError(err: unknown, fallbackKey: string): void {
    const key = cargaMasivaErrorKey(err);
    if (key) {
      this.notifier.showError(this.transloco.translate(key, this.limits));
    } else {
      this.notifier.showServerError(err, this.transloco.translate(fallbackKey));
    }
  }

  goBack(): void {
    this.router.navigate([this.config().backRoute]);
  }

  // Merges err.field and err.params into one object for the transloco pipe
  getErrorParams(err: ValidationError): Record<string, unknown> {
    return { field: err.field, ...(err.params ?? {}) };
  }
}
