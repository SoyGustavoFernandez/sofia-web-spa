import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TranslocoModule, TranslocoService, provideTranslocoScope } from '@jsverse/transloco';
import { EmpresaService } from '../services/empresa.service';
import { Empresa, EstadoEmpresa } from '../models/empresa.model';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { EmpresaDeleteDialogComponent } from '../empresa-delete-dialog/empresa-delete-dialog.component';

@Component({
  selector: 'app-empresa-search',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    TranslocoModule,
  ],
  providers: [provideTranslocoScope('empresa')],
  templateUrl: './empresa-search.component.html',
})
export class EmpresaSearchComponent implements OnInit {
  private readonly empresaService = inject(EmpresaService);
  private readonly errorNotifier = inject(ErrorNotifierService);
  private readonly dialog = inject(MatDialog);
  private readonly transloco = inject(TranslocoService);

  readonly displayedColumns = ['nombre', 'ruc', 'estado', 'fechaVencimiento', 'estaVigente', 'cantidadSucursales', 'acciones'];
  readonly EstadoEmpresa = EstadoEmpresa;

  readonly empresas = signal<Empresa[]>([]);
  readonly loading = signal(false);
  searchText = '';

  get filteredEmpresas(): Empresa[] {
    const q = this.searchText.toLowerCase();
    if (!q) return this.empresas();
    return this.empresas().filter(e =>
      e.nombre.toLowerCase().includes(q) || (e.ruc ?? '').includes(q)
    );
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.empresaService.getAll().subscribe({
      next: data => { this.empresas.set(data); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.errorNotifier.showError(this.transloco.translate('empresa.notifications.loadError'));
      },
    });
  }

  openDelete(empresa: Empresa): void {
    const ref = this.dialog.open(EmpresaDeleteDialogComponent, {
      data: empresa,
      width: '480px',
    });
    ref.afterClosed().subscribe(confirmed => { if (confirmed) this.load(); });
  }

  estadoLabel(estado: EstadoEmpresa): string {
    return this.transloco.translate(`empresa.estado.${estado}`);
  }

  estadoClass(estado: EstadoEmpresa): string {
    const map: Record<number, string> = {
      [EstadoEmpresa.TrialActivo]: 'chip-trial',
      [EstadoEmpresa.Activo]: 'chip-activo',
      [EstadoEmpresa.Suspendido]: 'chip-suspendido',
      [EstadoEmpresa.Cancelado]: 'chip-cancelado',
    };
    return map[estado] ?? '';
  }
}
