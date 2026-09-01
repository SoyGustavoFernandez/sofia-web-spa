import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-ingredientes-activos-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('ingredientesActivos')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class IngredientesActivosCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/ingredientesactivos/plantilla`,
    previewUrl: `${this.base}/api/v1/ingredientesactivos/previsualizar`,
    saveUrl: `${this.base}/api/v1/ingredientesactivos/carga-masiva`,
    backRoute: '/ingredientes-activos',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.catalogos' },
      { label: 'breadcrumbs.ingredientes-activos', route: '/ingredientes-activos' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'denominacionDci', label: 'fields.denominacionDci', required: true },
      { key: 'codigoAtc', label: 'fields.codigoAtc', required: true },
    ],
  }));
}
