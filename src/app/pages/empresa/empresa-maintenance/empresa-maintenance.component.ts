import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { EmpresaService } from '../services/empresa.service';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { Empresa, EstadoEmpresa } from '../models/empresa.model';

@Component({
  selector: 'app-empresa-maintenance',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    TranslocoModule,
  ],
  providers: [provideTranslocoScope('empresa')],
  templateUrl: './empresa-maintenance.component.html',
})
export class EmpresaMaintenanceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(EmpresaService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly transloco = inject(TranslocoService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly empresa = signal<Empresa | null>(null);
  readonly EstadoEmpresa = EstadoEmpresa;

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    ruc: [null as string | null, [Validators.pattern(/^\d{11}$/)]],
  });

  private empresaId!: string;

  ngOnInit(): void {
    this.empresaId = this.route.snapshot.paramMap.get('id')!;
    this.loading.set(true);
    this.service.getById(this.empresaId).subscribe({
      next: e => {
        this.empresa.set(e);
        this.form.patchValue({ nombre: e.nombre, ruc: e.ruc });
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('empresa.notifications.loadSingleError'));
      },
    });
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { nombre, ruc } = this.form.value;
    this.service.update(this.empresaId, { nombre: nombre!, ruc: ruc ?? null }).subscribe({
      next: () => {
        this.notifier.showSuccess(this.transloco.translate('empresa.notifications.updated'));
        this.router.navigate(['/empresas']);
      },
      error: () => {
        this.saving.set(false);
        this.notifier.showError(this.transloco.translate('empresa.notifications.updateError'));
      },
    });
  }

  estadoLabel(estado: EstadoEmpresa): string {
    return this.transloco.translate(`empresa.estado.${estado}`);
  }
}
