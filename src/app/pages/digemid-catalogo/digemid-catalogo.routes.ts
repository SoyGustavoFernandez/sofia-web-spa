import { Routes } from '@angular/router';

export const DIGEMID_CATALOGO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./digemid-catalogo-search/digemid-catalogo-search.component').then(
        m => m.DigemidCatalogoSearchComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./digemid-catalogo-carga-masiva/digemid-catalogo-carga-masiva.component').then(
        m => m.DigemidCatalogoCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./digemid-catalogo-detail/digemid-catalogo-detail.component').then(
        m => m.DigemidCatalogoDetailComponent,
      ),
  },
];
