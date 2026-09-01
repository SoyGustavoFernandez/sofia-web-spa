import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, provideTranslocoScope } from '@jsverse/transloco';
import { CargaMasivaPageComponent } from '@shared/components/carga-masiva-page/carga-masiva-page.component';
import { CargaMasivaConfig } from '@shared/models/carga-masiva.model';
import { environment } from '@environment/environment';

@Component({
  selector: 'app-pacientes-carga-masiva',
  template: `<app-carga-masiva-page [config]="config()" />`,
  standalone: true,
  providers: [provideTranslocoScope('pacientes')],
  imports: [CommonModule, TranslocoModule, CargaMasivaPageComponent],
})
export class PacientesCargaMasivaComponent {
  private readonly base = environment.api.baseurl;

  readonly config = computed<CargaMasivaConfig>(() => ({
    downloadUrl: `${this.base}/api/v1/pacientes/plantilla`,
    previewUrl: `${this.base}/api/v1/pacientes/previsualizar`,
    saveUrl: `${this.base}/api/v1/pacientes/carga-masiva`,
    backRoute: '/pacientes',
    breadcrumbs: [
      { label: 'breadcrumbs.home', route: '/dashboard' },
      { label: 'breadcrumbs.pacientes-atencion' },
      { label: 'breadcrumbs.pacientes', route: '/pacientes' },
      { label: 'breadcrumbs.carga-masiva', isActive: true },
    ],
    columns: [
      { key: 'docIdentidadGub', label: 'fields.docIdentidadGub', required: true },
      { key: 'nombreApellidos', label: 'fields.nombreApellidos', required: true },
      { key: 'fechaNacimiento', label: 'fields.fechaNacimiento', required: true },
      { key: 'contactoPrimario', label: 'fields.contactoPrimario', required: false },
    ],
  }));
}
