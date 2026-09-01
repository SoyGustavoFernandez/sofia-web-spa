import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-laboratorios-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('laboratorios')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class LaboratoriosCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/laboratorios/plantilla`,
    previewUrl: `${this.base}/api/v1/laboratorios/previsualizar`,
    saveUrl: `${this.base}/api/v1/laboratorios/carga-masiva`,
    backRoute: '/laboratorios',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.laboratorios', route: '/laboratorios' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'nombreCompania', label: 'fields.nombreCompania', required: true },
      { key: 'codigoIdentificador', label: 'fields.codigoIdentificador', required: false },
    ],
  }));
}
