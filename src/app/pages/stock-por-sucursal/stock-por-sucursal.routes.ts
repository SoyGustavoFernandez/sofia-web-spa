import { Route } from '@angular/router';

export const STOCK_POR_SUCURSAL_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./stock-search/stock-search.component').then(m => m.StockSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./stock-detail/stock-detail.component').then(m => m.StockDetailComponent),
    data: { isNew: true },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./stock-detail/stock-detail.component').then(m => m.StockDetailComponent),
  },
];
