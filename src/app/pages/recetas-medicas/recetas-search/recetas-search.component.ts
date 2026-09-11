import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MaterialModule } from '@shared/material.module';
import { PageHeaderComponent, BreadcrumbItem } from '@shared/components/page-header/page-header.component';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { SearchStateService } from '@core/services/shared/search-state.service';
import { RecetaMedicaService } from '../services/receta-medica.service';
import { RecetaListItem } from '../models/receta-medica.model';
import { PacienteService } from '../../pacientes/services/paciente.service';
import { PacienteListItem } from '../../pacientes/models/paciente.model';
import { ProfesionalSaludService } from '../../profesionales-salud/services/profesional-salud.service';
import { ProfesionalSaludListItem } from '../../profesionales-salud/models/profesional-salud.model';

@Component({
  selector: 'app-recetas-search',
  standalone: true,
  templateUrl: './recetas-search.component.html',
  providers: [provideTranslocoScope('recetas-medicas')],
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslocoModule, MaterialModule, PageHeaderComponent],
})
export class RecetasSearchComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly service = inject(RecetaMedicaService);
  private readonly pacienteService = inject(PacienteService);
  private readonly medicoService = inject(ProfesionalSaludService);
  private readonly transloco = inject(TranslocoService);
  private readonly notifier = inject(ErrorNotifierService);
  private readonly searchState = inject(SearchStateService);

  readonly displayedColumns = ['clienteNombre', 'medicoNombre', 'fechaExpedicion', 'repeticionesMax', 'indicacionesUso'];

  readonly loading = signal(false);
  readonly showResults = signal(false);
  readonly items = signal<RecetaListItem[]>([]);
  readonly totalCount = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);
  readonly pacienteOptions = signal<PacienteListItem[]>([]);
  readonly medicoOptions = signal<ProfesionalSaludListItem[]>([]);

  private selectedPacienteId = signal<string | null>(null);
  private selectedMedicoId = signal<string | null>(null);

  readonly form = this.fb.group({
    pacienteNombre: [''],
    medicoNombre: [''],
    fechaInicio: [null as Date | null],
    fechaFin: [null as Date | null],
  });

  readonly breadcrumbs: BreadcrumbItem[] = [
    { label: 'breadcrumbs.home', route: '/dashboard' },
    { label: 'breadcrumbs.pacientesAtencion' },
    { label: 'breadcrumbs.recetasMedicas' },
  ];

  private get stateKey(): string {
    return this.router.url.split('?')[0];
  }

  constructor() {
    this.form.controls.pacienteNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          this.selectedPacienteId.set(null);
          if (!term) return of({ items: [] as PacienteListItem[] });
          return this.pacienteService.search({ nombreApellidos: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.pacienteOptions.set(result.items));

    this.form.controls.medicoNombre.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => {
          this.selectedMedicoId.set(null);
          if (!term) return of({ items: [] as ProfesionalSaludListItem[] });
          return this.medicoService.search({ nombrePrescriptor: term, pageNumber: 1, pageSize: 20 });
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.medicoOptions.set(result.items));
  }

  ngOnInit(): void {
    const saved = this.searchState.restore(this.stateKey);
    if (saved) {
      this.form.patchValue(saved.formValues as never, { emitEvent: false });
      this.selectedPacienteId.set((saved.formValues['clienteId'] as string) ?? null);
      this.selectedMedicoId.set((saved.formValues['medicoId'] as string) ?? null);
      this.pageIndex.set(saved.pageIndex);
      this.pageSize.set(saved.pageSize);
      this.buscar();
    }
  }

  selectPaciente(p: PacienteListItem): void {
    this.selectedPacienteId.set(p.id);
    this.form.controls.pacienteNombre.setValue(p.nombreApellidos, { emitEvent: false });
    this.pacienteOptions.set([]);
  }

  selectMedico(m: ProfesionalSaludListItem): void {
    this.selectedMedicoId.set(m.id);
    this.form.controls.medicoNombre.setValue(m.nombrePrescriptor, { emitEvent: false });
    this.medicoOptions.set([]);
  }

  buscar(): void {
    this.loading.set(true);
    const v = this.form.value;
    const clienteId = this.selectedPacienteId() ?? undefined;
    const medicoId = this.selectedMedicoId() ?? undefined;
    this.service.search({
      clienteId,
      medicoId,
      fechaInicio: v.fechaInicio ? (v.fechaInicio as Date).toISOString() : undefined,
      fechaFin: v.fechaFin ? (v.fechaFin as Date).toISOString() : undefined,
      pageNumber: this.pageIndex() + 1,
      pageSize: this.pageSize(),
    }).subscribe({
      next: result => {
        this.items.set(result.items);
        this.totalCount.set(result.totalCount);
        this.showResults.set(true);
        this.loading.set(false);
        this.searchState.save(this.stateKey, {
          formValues: { ...this.form.getRawValue(), clienteId, medicoId },
          pageIndex: this.pageIndex(),
          pageSize: this.pageSize(),
        });
      },
      error: () => {
        this.loading.set(false);
        this.notifier.showError(this.transloco.translate('recetasMedicas.search.search-error'));
      },
    });
  }

  limpiar(): void {
    this.form.reset();
    this.selectedPacienteId.set(null);
    this.selectedMedicoId.set(null);
    this.pacienteOptions.set([]);
    this.medicoOptions.set([]);
    this.showResults.set(false);
    this.items.set([]);
    this.totalCount.set(0);
    this.pageIndex.set(0);
    this.searchState.clear(this.stateKey);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.buscar();
  }

  goToNew(): void {
    this.router.navigate(['/recetas-medicas/nueva']);
  }

  exportar(): void {
    const t = (key: string) => this.transloco.translate(key, {}, 'recetasMedicas');
    const lang = this.transloco.getActiveLang();
    const headers = [
      t('table.paciente'),
      t('table.medico'),
      t('table.fechaExpedicion'),
      t('table.repeticiones'),
      t('table.indicaciones'),
    ];
    const dateFormat = lang === 'es' ? 'dd/MM/yyyy' : 'MM/dd/yyyy';
    this.service.exportar({
      headers,
      dateFormat,
      clienteId: this.selectedPacienteId() ?? undefined,
      medicoId: this.selectedMedicoId() ?? undefined,
    }).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.transloco.translate('recetasMedicas.search.export-filename');
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.notifier.showError(this.transloco.translate('recetasMedicas.search.search-error')),
    });
  }
}
