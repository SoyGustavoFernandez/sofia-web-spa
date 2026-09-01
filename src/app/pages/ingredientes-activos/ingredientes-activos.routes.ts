import { Routes } from '@angular/router';

export const INGREDIENTES_ACTIVOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./ingredientes-activos-search/ingredientes-activos-search.component').then(
        m => m.IngredientesActivosSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./ingredientes-activos-detail/ingredientes-activos-detail.component').then(
        m => m.IngredientesActivosDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./ingredientes-activos-carga-masiva/ingredientes-activos-carga-masiva.component').then(
        m => m.IngredientesActivosCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./ingredientes-activos-detail/ingredientes-activos-detail.component').then(
        m => m.IngredientesActivosDetailComponent,
      ),
  },
];
