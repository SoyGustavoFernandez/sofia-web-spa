import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-sucursales-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('sucursales')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class SucursalesCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/sucursales/plantilla`,
    previewUrl: `${this.base}/api/v1/sucursales/previsualizar`,
    saveUrl: `${this.base}/api/v1/sucursales/carga-masiva`,
    backRoute: '/sucursales',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.administracion' },
      { label: 'breadcrumbs.sucursales', route: '/sucursales' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'nombre', label: 'fields.nombre', required: true },
      { key: 'direccionFisica', label: 'fields.direccionFisica', required: true },
      { key: 'numeroLicencia', label: 'fields.numeroLicencia', required: true },
    ],
  }));
}
