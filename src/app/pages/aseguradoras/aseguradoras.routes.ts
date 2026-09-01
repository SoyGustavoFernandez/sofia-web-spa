import { Routes } from '@angular/router';

export const ASEGURADORAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./aseguradoras-search/aseguradoras-search.component').then(
        m => m.AseguradorasSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./aseguradoras-detail/aseguradoras-detail.component').then(
        m => m.AseguradorasDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./aseguradoras-carga-masiva/aseguradoras-carga-masiva.component').then(
        m => m.AseguradorasCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./aseguradoras-detail/aseguradoras-detail.component').then(
        m => m.AseguradorasDetailComponent,
      ),
  },
];
