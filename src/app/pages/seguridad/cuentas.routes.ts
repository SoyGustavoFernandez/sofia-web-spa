import { Routes } from '@angular/router';

export const CUENTAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./cuentas-search/cuentas-search.component').then(m => m.CuentasSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./cuentas-detail/cuentas-detail.component').then(m => m.CuentasDetailComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./cuentas-detail/cuentas-detail.component').then(m => m.CuentasDetailComponent),
  },
];
