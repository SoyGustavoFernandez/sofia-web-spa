import { Route } from '@angular/router';

export const POS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./search/ventas-search.component').then(m => m.VentasSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./nueva-venta/nueva-venta.component').then(m => m.NuevaVentaComponent),
    data: { isNew: true },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./venta-detail/venta-detail.component').then(m => m.VentaDetailComponent),
  },
];
