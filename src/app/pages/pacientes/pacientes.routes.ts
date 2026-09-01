import { Routes } from '@angular/router';

export const PACIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pacientes-search/pacientes-search.component').then(
        m => m.PacientesSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pacientes-detail/pacientes-detail.component').then(
        m => m.PacientesDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./pacientes-carga-masiva/pacientes-carga-masiva.component').then(
        m => m.PacientesCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pacientes-detail/pacientes-detail.component').then(
        m => m.PacientesDetailComponent,
      ),
  },
];
