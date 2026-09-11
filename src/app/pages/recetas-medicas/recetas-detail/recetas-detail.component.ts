import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ConfirmDialogComponent } from '@shared/components/confirm-dialog/confirm-dialog.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { RecetaMedicaService } from '../services/receta-medica.service';
import { RecetaDetail } from '../models/receta-medica.model';
import { PacienteService } from '../../pacientes/services/paciente.service';
import { PacienteListItem } from '../../pacientes/models/paciente.model';
import { ProfesionalSaludService } from '../../profesionales-salud/services/profesional-salud.service';
import { ProfesionalSaludListItem } from '../../profesionales-salud/models/profesional-salud.model';

@Component({
  selector: 'app-recetas-detail',
  standalone: true,
  templateUrl: './recetas-detail.component.html',
  providers: [provideTranslocoScope('recetas-medicas')],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class RecetasDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(RecetaMedicaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly medicoService = inject(ProfesionalSaludService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);

  readonly isNew = signal(false);
  readonly isEditing = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly snapshot = signal<RecetaDetail | null>(null);

  readonly pacienteCtrl = new FormControl('');
  readonly medicoCtrl = new FormControl('');
  readonly selectedPaciente = signal<PacienteListItem | null>(null);
  readonly selectedMedico = signal<ProfesionalSaludListItem | null>(null);
  readonly pacienteOptions = signal<PacienteListItem[]>([]);
  readonly medicoOptions = signal<ProfesionalSaludListItem[]>([]);

  readonly form = this.fb.group({
    fechaExpedicion: [null as Date | null, Validators.required],
    repeticionesMax: [0, [Validators.required, Validators.min(0)]],
    indicacionesUso: [''],
  });

  private entityId = '';

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientesAtencion' },
    { label: 'breadcrumbs.recetasMedicas', route: '/recetas-medicas' },
  ];

  constructor() {
    this.pacienteCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as PacienteListItem[] });
        return this.pacienteService.search({ nombreApellidos: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.pacienteOptions.set(result.items));

    this.medicoCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string') return of({ items: [] as ProfesionalSaludListItem[] });
        return this.medicoService.search({ nombrePrescriptor: term, pageNumber: 1, pageSize: 20 });
      }),
      takeUntilDestroyed(),
    ).subscribe(result => this.medicoOptions.set(result.items));
  }

  ngOnInit(): void {
    if (this.route.snapshot.data['isNew'] === true) {
      this.isNew.set(true);
      this.isEditing.set(true);
      return;
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/recetas-medicas']); return; }
    this.entityId = id;
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.service.getById(this.entityId).subscribe({
      next: detail => {
        this.snapshot.set(detail);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('recetasMedicas.edit.load-error'));
      },
    });
  }

  startEdit(): void {
    const s = this.snapshot();
    if (!s) return;
    this.pacienteCtrl.setValue(s.clienteNombre, { emitEvent: false });
    this.selectedPaciente.set({ id: s.clienteId, nombreApellidos: s.clienteNombre, docIdentidadGub: '', fechaNacimiento: '', contactoPrimario: null });
    this.medicoCtrl.setValue(s.medicoNombre, { emitEvent: false });
    this.selectedMedico.set({ id: s.medicoId, nombrePrescriptor: s.medicoNombre, numeroRegistro: '', direccionClinica: null });
    const parts = s.fechaExpedicion.split('-').map(Number);
    this.form.patchValue({
      fechaExpedicion: new Date(parts[0], parts[1] - 1, parts[2]),
      repeticionesMax: s.repeticionesMax,
      indicacionesUso: s.indicacionesUso ?? '',
    });
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    if (this.isNew()) { this.router.navigate(['/recetas-medicas']); return; }
    this.isEditing.set(false);
    this.form.reset();
    this.pacienteCtrl.setErrors(null);
    this.medicoCtrl.setErrors(null);
  }

  selectPaciente(p: PacienteListItem): void {
    this.selectedPaciente.set(p);
    this.pacienteCtrl.setValue(p.nombreApellidos, { emitEvent: false });
    this.pacienteCtrl.setErrors(null);
  }

  selectMedico(m: ProfesionalSaludListItem): void {
    this.selectedMedico.set(m);
    this.medicoCtrl.setValue(m.nombrePrescriptor, { emitEvent: false });
    this.medicoCtrl.setErrors(null);
  }

  private validateAutocompletes(): boolean {
    let valid = true;
    if (!this.selectedPaciente()) {
      this.pacienteCtrl.setErrors({ required: true });
      this.pacienteCtrl.markAsTouched();
      valid = false;
    }
    if (!this.selectedMedico()) {
      this.medicoCtrl.setErrors({ required: true });
      this.medicoCtrl.markAsTouched();
      valid = false;
    }
    return valid;
  }

  private toDateOnlyString(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (!this.validateAutocompletes() || this.form.invalid) return;

    const v = this.form.value;
    const body = {
      clienteId: this.selectedPaciente()!.id,
      medicoId: this.selectedMedico()!.id,
      fechaExpedicion: this.toDateOnlyString(v.fechaExpedicion as Date),
      repeticionesMax: v.repeticionesMax ?? 0,
      indicacionesUso: v.indicacionesUso || undefined,
    };

    this.saving.set(true);

    if (this.isNew()) {
      this.service.create(body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('recetasMedicas.create.save-success'));
          this.router.navigate(['/recetas-medicas']);
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('recetasMedicas.create.save-error'));
        },
      });
    } else {
      this.service.update(this.entityId, body).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('recetasMedicas.edit.save-success'));
          this.isEditing.set(false);
          this.saving.set(false);
          this.load();
        },
        error: () => {
          this.saving.set(false);
          this.notifier.showError(this.transloco.translate('recetasMedicas.edit.save-error'));
        },
      });
    }
  }

  eliminar(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: this.transloco.translate('recetasMedicas.delete.confirm-title'),
        message: this.transloco.translate('recetasMedicas.delete.confirm-message'),
      },
    });
    ref.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.deleting.set(true);
      this.service.delete(this.entityId).subscribe({
        next: () => {
          this.notifier.showSuccess(this.transloco.translate('recetasMedicas.delete.success'));
          this.router.navigate(['/recetas-medicas']);
        },
        error: () => {
          this.deleting.set(false);
          this.notifier.showError(this.transloco.translate('recetasMedicas.delete.error'));
        },
      });
    });
  }
}
