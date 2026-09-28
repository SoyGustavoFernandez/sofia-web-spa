import { Route } from '@angular/router';

export const SERIES_FISCALES_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./series-fiscales-search/series-fiscales-search.component').then(
        m => m.SeriesFiscalesSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./series-fiscales-detail/series-fiscales-detail.component').then(
        m => m.SeriesFiscalesDetailComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./series-fiscales-detail/series-fiscales-detail.component').then(
        m => m.SeriesFiscalesDetailComponent,
      ),
  },
];
