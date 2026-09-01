import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-aseguradoras-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('aseguradoras')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class AseguradorasCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/seguros/plantilla`,
    previewUrl: `${this.base}/api/v1/seguros/previsualizar`,
    saveUrl: `${this.base}/api/v1/seguros/carga-masiva`,
    backRoute: '/aseguradoras',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.aseguradoras', route: '/aseguradoras' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'nombreComercial', label: 'fields.nombreComercial', required: true },
      { key: 'codigoIdentificadorNacional', label: 'fields.codigoIdentificadorNacional', required: true },
    ],
  }));
}
