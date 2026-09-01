import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-proveedores-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('proveedores')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class ProveedoresCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/proveedores/plantilla`,
    previewUrl: `${this.base}/api/v1/proveedores/previsualizar`,
    saveUrl: `${this.base}/api/v1/proveedores/carga-masiva`,
    backRoute: '/proveedores',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.proveedores', route: '/proveedores' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'razonSocial', label: 'fields.razonSocial', required: true },
      { key: 'taxId', label: 'fields.taxId', required: true },
      { key: 'terminosFinancieros', label: 'fields.terminosFinancieros', required: false },
      { key: 'calificacionEsg', label: 'fields.calificacionEsg', required: false },
      { key: 'tasaCumplimiento', label: 'fields.tasaCumplimiento', required: true },
    ],
  }));
}
