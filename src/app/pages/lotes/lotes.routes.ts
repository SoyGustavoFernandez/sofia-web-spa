import { Route } from '@angular/router';

export const LOTES_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./lotes-search/lotes-search.component').then(
        m => m.LotesSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./lotes-detail/lotes-detail.component').then(
        m => m.LotesDetailComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./lotes-detail/lotes-detail.component').then(
        m => m.LotesDetailComponent,
      ),
  },
];
