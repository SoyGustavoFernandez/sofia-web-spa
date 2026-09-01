import { Routes } from '@angular/router';

export const UNIDADES_MEDIDA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./unidades-medida-search/unidades-medida-search.component').then(
        m => m.UnidadesMedidaSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./unidades-medida-detail/unidades-medida-detail.component').then(
        m => m.UnidadesMedidaDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./unidades-medida-carga-masiva/unidades-medida-carga-masiva.component').then(
        m => m.UnidadesMedidaCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./unidades-medida-detail/unidades-medida-detail.component').then(
        m => m.UnidadesMedidaDetailComponent,
      ),
  },
];
