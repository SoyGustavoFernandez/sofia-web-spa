import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-profesionales-salud-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('profesionalesSalud')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class ProfesionalesSaludCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/profesionalessalud/plantilla`,
    previewUrl: `${this.base}/api/v1/profesionalessalud/previsualizar`,
    saveUrl: `${this.base}/api/v1/profesionalessalud/carga-masiva`,
    backRoute: '/profesionales-salud',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.pacientes-atencion' },
      { label: 'breadcrumbs.profesionales-salud', route: '/profesionales-salud' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'numeroRegistro', label: 'fields.numeroRegistro', required: true },
      { key: 'nombrePrescriptor', label: 'fields.nombrePrescriptor', required: true },
      { key: 'direccionClinica', label: 'fields.direccionClinica', required: false },
    ],
  }));
}
