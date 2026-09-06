import { Route } from '@angular/router';

export const MEDICAMENTOS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./medicamentos-search/medicamentos-search.component').then(
        m => m.MedicamentosSearchComponent
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./medicamentos-detail/medicamentos-detail.component').then(
        m => m.MedicamentosDetailComponent
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./medicamentos-carga-masiva/medicamentos-carga-masiva.component').then(
        m => m.MedicamentosCargaMasivaComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./medicamentos-detail/medicamentos-detail.component').then(
        m => m.MedicamentosDetailComponent
      ),
  },
];
