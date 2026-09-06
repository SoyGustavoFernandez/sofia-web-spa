import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-medicamentos-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('medicamentos')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class MedicamentosCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/medicamentos/plantilla`,
    previewUrl: `${this.base}/api/v1/medicamentos/previsualizar`,
    saveUrl: `${this.base}/api/v1/medicamentos/carga-masiva`,
    backRoute: '/medicamentos',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.medicamentos', route: '/medicamentos' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'codigoNacional', label: 'fields.codigoNacional', required: true },
      { key: 'nombreComercial', label: 'fields.nombreComercial', required: true },
      { key: 'laboratorio', label: 'fields.laboratorio', required: true },
      { key: 'unidadBase', label: 'fields.unidadBase', required: true },
      { key: 'condicionVenta', label: 'fields.condicionVenta', required: true },
    ],
  }));
}
