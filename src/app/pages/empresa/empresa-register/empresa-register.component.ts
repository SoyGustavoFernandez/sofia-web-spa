import { Component, inject, signal } from '@angular/core';
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

  readonly form = this.fb.group({
    nombreEmpresa: ['', [Validators.required, Validators.maxLength(200)]],
    usuario: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    ruc: [null as string | null, [Validators.pattern(/^\d{11}$/)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const { nombreEmpresa, usuario, password, ruc } = this.form.value;

    this.service.register({
      nombreEmpresa: nombreEmpresa!,
      usuario: usuario!,
      password: password!,
      ruc: ruc || null,
    }).subscribe({
      next: res => {
        this.auth.storeToken(res.token);
        this.notifier.showSuccess(this.transloco.translate('empresa.notifications.registerSuccess'));
        void this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.submitting.set(false);
        this.notifier.showError(this.transloco.translate('empresa.notifications.registerError'));
      },
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(v => !v);
  }
}
