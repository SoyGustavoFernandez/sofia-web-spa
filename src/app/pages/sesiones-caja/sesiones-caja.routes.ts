import { Route } from '@angular/router';

export const SESIONES_CAJA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./sesiones-search/sesiones-search.component').then(m => m.SesionesSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./sesiones-detail/sesiones-detail.component').then(m => m.SesionesDetailComponent),
    data: { isNew: true },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./sesiones-detail/sesiones-detail.component').then(m => m.SesionesDetailComponent),
  },
];
