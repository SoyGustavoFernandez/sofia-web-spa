import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-jerarquias-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('jerarquias')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class JerarquiasCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/jerarquiasuom/plantilla`,
    previewUrl: `${this.base}/api/v1/jerarquiasuom/previsualizar`,
    saveUrl: `${this.base}/api/v1/jerarquiasuom/carga-masiva`,
    backRoute: '/jerarquias',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.jerarquias', route: '/jerarquias' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'producto', label: 'fields.producto', required: true },
      { key: 'unidadMayor', label: 'fields.unidadMayor', required: true },
      { key: 'unidadMenor', label: 'fields.unidadMenor', required: true },
      { key: 'multiplicador', label: 'fields.multiplicador', required: true },
    ],
  }));
}
