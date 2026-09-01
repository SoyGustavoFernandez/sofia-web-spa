import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-empresa-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('empresa')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class EmpresaCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/empresas/plantilla`,
    previewUrl: `${this.base}/api/v1/empresas/previsualizar`,
    saveUrl: `${this.base}/api/v1/empresas/carga-masiva`,
    backRoute: '/empresas',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.administracion' },
      { label: 'breadcrumbs.empresa', route: '/empresas' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'nombre', label: 'fields.nombre', required: true },
      { key: 'ruc', label: 'fields.ruc', required: false },
    ],
  }));
}
