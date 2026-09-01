import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-search/empresa-search.component').then(m => m.EmpresaSearchComponent),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./empresa-carga-masiva/empresa-carga-masiva.component').then(
        m => m.EmpresaCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./empresa-detail/empresa-detail.component').then(m => m.EmpresaDetailComponent),
  },
];
