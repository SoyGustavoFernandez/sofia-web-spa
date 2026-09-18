import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { EnvelopeError } from '../../responses/common-error-response';
import { ServerErrorSnackbarComponent } from '@shared/components/server-error-snackbar/server-error-snackbar.component';

export interface SmartErrorOptions {
  duration?: number;
  fallback?: string;
}

@Injectable({ providedIn: 'root' })
export class ErrorNotifierService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  showSmartErrors(errors: EnvelopeError[], opts?: SmartErrorOptions): void {
    const duration = opts?.duration ?? 5000;
    const message = errors.length > 0
      ? errors.map(e => e.errorMessage || e.errorCode).join(' | ')
      : (opts?.fallback ?? this.transloco.translate<string>('errors.unknownError'));
    this.snackBar.open(message, this.transloco.translate<string>('actions.close'), { duration, panelClass: ['error-snackbar'] });
  }

  showError(message: string, duration = 5000): void {
    this.snackBar.open(message, this.transloco.translate<string>('actions.close'), { duration, panelClass: ['error-snackbar'] });
  }

  showSuccess(message: string, duration = 3000): void {
    this.snackBar.open(message, this.transloco.translate<string>('actions.close'), { duration, panelClass: ['success-snackbar'] });
  }

  showServerError(err: unknown, friendlyMessage: string): void {
    const httpErr = err instanceof HttpErrorResponse ? err : null;
    const traceId: string | undefined = httpErr?.error?.traceId ?? httpErr?.error?.extensions?.traceId;
    if (traceId) {
      this.snackBar.openFromComponent(ServerErrorSnackbarComponent, {
        data: { message: friendlyMessage, traceId },
        duration: 10000,
        panelClass: ['error-snackbar'],
      });
    } else {
      this.showError(friendlyMessage);
    }
  }
}
