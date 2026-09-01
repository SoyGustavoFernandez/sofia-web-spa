import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-digemid-catalogo-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('digemidCatalogo')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class DigemidCatalogoCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/digemid/catalogo/plantilla`,
    previewUrl: `${this.base}/api/v1/digemid/catalogo/previsualizar`,
    saveUrl: `${this.base}/api/v1/digemid/catalogo/carga-masiva`,
    backRoute: '/digemid-catalogo',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.digemid' },
      { label: 'breadcrumbs.digemid-catalogo', route: '/digemid-catalogo' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'codProd', label: 'fields.codProd', required: true },
      { key: 'nomProd', label: 'fields.nomProd', required: true },
      { key: 'concent', label: 'fields.concent', required: false },
      { key: 'formaFarmaceutica', label: 'fields.formaFarmaceutica', required: false },
      { key: 'fraccion', label: 'fields.fraccion', required: false },
      { key: 'registroSanitario', label: 'fields.registroSanitario', required: false },
      { key: 'titular', label: 'fields.titular', required: false },
      { key: 'estado', label: 'fields.estado', required: true },
    ],
  }));
}
