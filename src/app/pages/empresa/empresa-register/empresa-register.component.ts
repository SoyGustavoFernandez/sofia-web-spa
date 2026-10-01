import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { EmpresaService } from '../services/empresa.service';
import { AuthService } from '@core/auth/auth.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';

// Mirrors the backend limits of the employee record created for the admin
const NAME_MAX_LENGTH = 75;
const EMAIL_MAX_LENGTH = 254;

// Backend codes that have a specific message instead of the generic error
const ERROR_KEYS: Record<string, string> = {
  'Empresa.RUC.Duplicado': 'empresa.notifications.rucDuplicado',
  'Auth.DuplicateUsername': 'empresa.notifications.usuarioDuplicado',
};

@Component({
  selector: 'app-empresa-register',
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
  ],
  providers: [provideTranslocoScope('empresa')],
  templateUrl: './empresa-register.component.html',
  styleUrl: './empresa-register.component.scss',
})
export class EmpresaRegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(EmpresaService);
  private readonly auth = inject(AuthService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly transloco = inject(TranslocoService);

  readonly submitting = signal(false);
  readonly hidePassword = signal(true);
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    nombreEmpresa: ['', [Validators.required, Validators.maxLength(200)]],
    ruc: ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
    adminNombres: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    adminApellidoPaterno: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    adminApellidoMaterno: ['', [Validators.maxLength(NAME_MAX_LENGTH)]],
    adminEmail: ['', [Validators.required, Validators.email, Validators.maxLength(EMAIL_MAX_LENGTH)]],
    usuario: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const v = this.form.getRawValue();

    this.service.register({
      nombreEmpresa: v.nombreEmpresa.trim(),
      ruc: v.ruc.trim(),
      adminNombres: v.adminNombres.trim(),
      adminApellidoPaterno: v.adminApellidoPaterno.trim(),
      adminApellidoMaterno: v.adminApellidoMaterno.trim() || null,
      adminEmail: v.adminEmail.trim(),
      usuario: v.usuario,
      password: v.password,
    }).subscribe({
      next: res => {
        this.auth.storeToken(res.token);
        this.notifier.showSuccess(this.transloco.translate('empresa.notifications.registerSuccess'));
        void this.router.navigate(['/dashboard']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? ERROR_KEYS[code] : undefined;
        this.notifier.showError(this.transloco.translate(key ?? 'empresa.notifications.registerError'));
      },
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(v => !v);
  }
}
