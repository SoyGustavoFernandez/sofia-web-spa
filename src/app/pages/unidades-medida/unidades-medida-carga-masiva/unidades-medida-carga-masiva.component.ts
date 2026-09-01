import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-unidades-medida-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('unidadesMedida')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class UnidadesMedidaCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/unidadesmedida/plantilla`,
    previewUrl: `${this.base}/api/v1/unidadesmedida/previsualizar`,
    saveUrl: `${this.base}/api/v1/unidadesmedida/carga-masiva`,
    backRoute: '/unidades-medida',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.unidades-medida', route: '/unidades-medida' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'codigo', label: 'fields.codigo', required: true },
      { key: 'descripcion', label: 'fields.descripcion', required: true },
    ],
  }));
}
