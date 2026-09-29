import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '@environment/environment';

// Login rejections that have a specific message; anything else is shown as invalid credentials
const LOGIN_ERROR_KEYS: Record<string, string> = {
  'Auth.EmpresaNoVigente': 'auth.empresaNoVigente',
};

@Component({
  selector: 'app-login',
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
  providers: [provideTranslocoScope('auth')],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  readonly submitting = signal(false);
  readonly hidePassword = signal(true);
  readonly loginError = signal<string | null>(null);
  readonly appVersion = environment.appVersion;
  readonly currentYear = new Date().getFullYear();

  readonly form = this.fb.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    this.loginError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { usuario, password } = this.form.value;

    this.auth.login({ nombreUsuario: usuario!, password: password! }).subscribe({
      next: () => {
        // An admin-assigned password must be replaced before anything else; the shell guard enforces it too
        void this.router.navigate([this.auth.requiresPasswordChange() ? '/cambiar-clave' : '/dashboard']);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const code: unknown = err instanceof HttpErrorResponse ? err.error?.code : undefined;
        const key = typeof code === 'string' ? LOGIN_ERROR_KEYS[code] : undefined;
        this.loginError.set(this.transloco.translate(key ?? 'auth.invalidCredentials'));
      },
    });
  }

  togglePassword(): void {
    this.hidePassword.update(v => !v);
  }
}
