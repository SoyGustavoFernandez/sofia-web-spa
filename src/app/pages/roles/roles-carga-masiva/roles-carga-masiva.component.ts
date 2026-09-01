import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-roles-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('roles')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class RolesCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/roles/plantilla`,
    previewUrl: `${this.base}/api/v1/roles/previsualizar`,
    saveUrl: `${this.base}/api/v1/roles/carga-masiva`,
    backRoute: '/roles',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.administracion' },
      { label: 'breadcrumbs.roles', route: '/roles' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'nombreRol', label: 'fields.nombreRol', required: true },
      { key: 'descripcion', label: 'fields.descripcion', required: false },
      { key: 'nivelJerarquia', label: 'fields.nivelJerarquia', required: true },
    ],
  }));
}
