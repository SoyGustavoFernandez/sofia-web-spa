import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { AuthService } from '@core/auth/auth.service';
import { AuthBrandPanelComponent } from '../auth-brand-panel/auth-brand-panel.component';

@Component({
  selector: 'app-forgot-password',
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
  templateUrl: './forgot-password.component.html',
  styleUrls: ['../login/login.component.scss', '../auth-recovery.scss'],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly transloco = inject(TranslocoService);

  readonly submitting = signal(false);
  readonly sent = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    usuario: ['', [Validators.required, Validators.maxLength(50)]],
  });

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    this.auth.forgotPassword(this.form.getRawValue().usuario.trim()).subscribe({
      // Same message whether or not the account exists, as the API intends
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: (err: unknown) => {
        this.submitting.set(false);
        const tooMany = err instanceof HttpErrorResponse && err.status === 429;
        this.error.set(this.transloco.translate(tooMany ? 'auth.recovery.tooManyRequests' : 'auth.forgotPage.error'));
      },
    });
  }
}
