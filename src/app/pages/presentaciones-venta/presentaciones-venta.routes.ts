import { Route } from '@angular/router';

export const PRESENTACIONES_VENTA_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./presentaciones-venta-search/presentaciones-venta-search.component').then(
        m => m.PresentacionesVentaSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./presentaciones-venta-detail/presentaciones-venta-detail.component').then(
        m => m.PresentacionesVentaDetailComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./presentaciones-venta-detail/presentaciones-venta-detail.component').then(
        m => m.PresentacionesVentaDetailComponent,
      ),
  },
];
