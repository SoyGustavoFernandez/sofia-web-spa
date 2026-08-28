import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EnvelopeError } from '../../responses/common-error-response';

export interface SmartErrorOptions {
  duration?: number;
  fallback?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorNotifierService {
  private readonly snackBar = inject(MatSnackBar);

  showSmartErrors(errors: EnvelopeError[], opts?: SmartErrorOptions): void {
    const duration = opts?.duration ?? 5000;
    const message = errors.length > 0
      ? errors.map(e => e.errorMessage || e.errorCode).join(' | ')
      : (opts?.fallback ?? 'Ocurrió un error inesperado.');
    this.snackBar.open(message, 'Cerrar', { duration, panelClass: ['error-snackbar'] });
  }

  showError(message: string, duration = 5000): void {
    this.snackBar.open(message, 'Cerrar', { duration, panelClass: ['error-snackbar'] });
  }

  showSuccess(message: string, duration = 3000): void {
    this.snackBar.open(message, 'Cerrar', { duration, panelClass: ['success-snackbar'] });
  }
}
