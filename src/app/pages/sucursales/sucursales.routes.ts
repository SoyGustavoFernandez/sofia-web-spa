import { Routes } from '@angular/router';

export const SUCURSALES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./sucursales-search/sucursales-search.component').then(m => m.SucursalesSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./sucursales-detail/sucursales-detail.component').then(m => m.SucursalesDetailComponent),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./sucursales-carga-masiva/sucursales-carga-masiva.component').then(
        m => m.SucursalesCargaMasivaComponent
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./sucursales-detail/sucursales-detail.component').then(m => m.SucursalesDetailComponent),
  },
];
