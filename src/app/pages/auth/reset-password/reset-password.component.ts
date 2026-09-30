import { Component, OnInit, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { MIN_PASSWORD_LENGTH } from '../../cambiar-clave/cambiar-clave.component';
import { AuthBrandPanelComponent } from '../auth-brand-panel/auth-brand-panel.component';

export const RESET_PASSWORD_PATH = '/auth/reset-password';

// Backend codes that have a specific message instead of the generic error
const ERROR_KEYS: Record<string, string> = {
  'Auth.InvalidToken': 'auth.resetPage.invalidToken',
};

const confirmationValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const confirm = group.get('confirmPassword')?.value as string;
  return confirm && confirm !== group.get('newPassword')?.value ? { mismatch: true } : null;
};

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    TranslocoModule,
    AuthBrandPanelComponent,
  ],
  providers: [provideTranslocoScope('auth')],
  templateUrl: './reset-password.component.html',
  styleUrls: ['../login/login.component.scss', '../auth-recovery.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);

  readonly minLength = MIN_PASSWORD_LENGTH;
  readonly submitting = signal(false);
  readonly hidePasswords = signal(true);
  readonly error = signal<string | null>(null);
  readonly linkValid = signal(false);

  private token = '';
  private usuario = '';

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: confirmationValidator },
  );

  ngOnInit(): void {
    // The link carries the secret in the fragment so it never reaches servers; drop it from the address bar and history right away
    const params = new URLSearchParams(this.route.snapshot.fragment ?? '');
    this.token = params.get('token') ?? '';
    this.usuario = params.get('usuario') ?? '';
    this.location.replaceState(RESET_PASSWORD_PATH);
    this.linkValid.set(this.token.length > 0 && this.usuario.length > 0);
  }

  togglePasswords(): void {
    this.hidePasswords.update(v => !v);
  }

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    this.auth.resetPassword({ nombreUsuario: this.usuario, token: this.token, newPassword: this.form.getRawValue().newPassword }).subscribe({
      next: () => {
        // Every session of the account was revoked server-side; a stale local one must not linger either
        this.auth.clearLocalSession();
        this.notifier.showSuccess(this.transloco.translate('auth.resetPage.success'), 6000);
        void this.router.navigate(['/auth/login']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const tooMany = err instanceof HttpErrorResponse && err.status === 429;
        const key = typeof code === 'string' ? ERROR_KEYS[code] : undefined;
        this.error.set(this.transloco.translate(key ?? (tooMany ? 'auth.recovery.tooManyRequests' : 'auth.resetPage.error')));
      },
    });
  }
}
