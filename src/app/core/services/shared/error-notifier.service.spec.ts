import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoService } from '@jsverse/transloco';
import { ErrorNotifierService } from './error-notifier.service';
import { ServerErrorSnackbarComponent } from '@shared/components/server-error-snackbar/server-error-snackbar.component';

describe('ErrorNotifierService', () => {
  let service: ErrorNotifierService;
  let snackBarSpy: jasmine.SpyObj<MatSnackBar>;
  let translateSpy: jasmine.Spy<(key: string) => string>;

  beforeEach(() => {
    snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent']);
    translateSpy = jasmine.createSpy('translate').and.callFake((key: string) => `t:${key}`);

    TestBed.configureTestingModule({
      providers: [
        { provide: MatSnackBar, useValue: snackBarSpy },
        { provide: TranslocoService, useValue: { translate: translateSpy } },
      ],
    });
    service = TestBed.inject(ErrorNotifierService);
  });

  it('showError() translates the "close" action label instead of hardcoding "Cerrar"', () => {
    service.showError('Something failed');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Something failed', 't:actions.close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
    expect(translateSpy).toHaveBeenCalledWith('actions.close');
  });

  it('showSuccess() also translates the "close" action label', () => {
    service.showSuccess('Saved!');

    expect(snackBarSpy.open).toHaveBeenCalledWith('Saved!', 't:actions.close', {
      duration: 3000,
      panelClass: ['success-snackbar'],
    });
  });

  it('showSmartErrors() joins backend error messages when present', () => {
    service.showSmartErrors([
      { errorCode: 'E1', errorMessage: 'Campo requerido' },
      { errorCode: 'E2', errorMessage: '' },
    ]);

    expect(snackBarSpy.open).toHaveBeenCalledWith('Campo requerido | E2', 't:actions.close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  });

  it('showSmartErrors() falls back to the translated unknown-error message, not a hardcoded string', () => {
    service.showSmartErrors([]);

    expect(translateSpy).toHaveBeenCalledWith('errors.unknownError');
    expect(snackBarSpy.open).toHaveBeenCalledWith('t:errors.unknownError', 't:actions.close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  });

  it('showSmartErrors() prefers an explicit fallback option over the translated default', () => {
    service.showSmartErrors([], { fallback: 'Custom fallback' });

    expect(snackBarSpy.open).toHaveBeenCalledWith('Custom fallback', 't:actions.close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  });

  it('showServerError() opens the rich snackbar component when a traceId is present', () => {
    const err = new HttpErrorResponse({ error: { traceId: 'trace-123' }, status: 500 });

    service.showServerError(err, 'Algo salió mal');

    expect(snackBarSpy.openFromComponent).toHaveBeenCalledWith(ServerErrorSnackbarComponent, {
      data: { message: 'Algo salió mal', traceId: 'trace-123' },
      duration: 10000,
      panelClass: ['error-snackbar'],
    });
  });

  it('showServerError() falls back to a plain translated-close error when there is no traceId', () => {
    service.showServerError(new Error('network down'), 'Algo salió mal');

    expect(snackBarSpy.openFromComponent).not.toHaveBeenCalled();
    expect(snackBarSpy.open).toHaveBeenCalledWith('Algo salió mal', 't:actions.close', {
      duration: 5000,
      panelClass: ['error-snackbar'],
    });
  });
});
