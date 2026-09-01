import { Routes } from '@angular/router';

export const LABORATORIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./laboratorios-search/laboratorios-search.component').then(
        m => m.LaboratoriosSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./laboratorios-detail/laboratorios-detail.component').then(
        m => m.LaboratoriosDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./laboratorios-carga-masiva/laboratorios-carga-masiva.component').then(
        m => m.LaboratoriosCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./laboratorios-detail/laboratorios-detail.component').then(
        m => m.LaboratoriosDetailComponent,
      ),
  },
];
