import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { AuthService } from '@core/auth/auth.service';

// Same minimum the API enforces at account creation, reset and change
export const MIN_PASSWORD_LENGTH = 8;

// Backend codes that have a specific message instead of the generic error
const ERROR_KEYS: Record<string, string> = {
  'Auth.ClaveActualIncorrecta': 'cambiarClave.errors.wrongCurrent',
};

// Flags the new password when it repeats the current one, and the confirmation when it differs from the new one
const passwordsValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const current = group.get('currentPassword')?.value as string;
  const next = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  const errors: ValidationErrors = {};
  if (next && next === current) errors['sameAsCurrent'] = true;
  if (confirm && confirm !== next) errors['mismatch'] = true;
  return Object.keys(errors).length ? errors : null;
};

@Component({
  selector: 'app-cambiar-clave',
  standalone: true,
  templateUrl: './cambiar-clave.component.html',
  styles: [`
    .forced-change-notice { padding: 12px 16px; border-radius: 8px; background: #fff4e5; color: #8a4b00; }
    .field-error { display: block; font-size: 12px; margin-top: -12px; }
  `],
  providers: [provideTranslocoScope('cambiar-clave')],
  imports: [ReactiveFormsModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class CambiarClaveComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly minLength = MIN_PASSWORD_LENGTH;
  readonly forced = this.auth.requiresPasswordChange;
  readonly saving = signal(false);
  readonly hidePasswords = signal(true);

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.cambiarClave' },
  ];

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsValidator },
  );

  togglePasswords(): void {
    this.hidePasswords.update(v => !v);
  }

  cancel(): void {
    void this.router.navigate(['/dashboard']);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const { currentPassword, newPassword } = this.form.getRawValue();

    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        // Every session was revoked server-side; drop the local one and sign in again
        this.notifier.showSuccess(this.transloco.translate('cambiarClave.success'), 6000);
        this.auth.clearLocalSession();
        void this.router.navigate(['/auth/login']);
      },
      error: (err: unknown) => {
        this.saving.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? ERROR_KEYS[code] : undefined;
        this.notifier.showServerError(err, this.transloco.translate(key ?? 'cambiarClave.errors.save'));
      },
    });
  }
}
