import { Route } from '@angular/router';

export const JERARQUIAS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./jerarquias-search/jerarquias-search.component').then(
        m => m.JerarquiasSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./jerarquias-detail/jerarquias-detail.component').then(
        m => m.JerarquiasDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./jerarquias-carga-masiva/jerarquias-carga-masiva.component').then(
        m => m.JerarquiasCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./jerarquias-detail/jerarquias-detail.component').then(
        m => m.JerarquiasDetailComponent,
      ),
  },
];
