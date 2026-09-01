import { Routes } from '@angular/router';

export const PROVEEDORES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./proveedores-search/proveedores-search.component').then(
        m => m.ProveedoresSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./proveedores-detail/proveedores-detail.component').then(
        m => m.ProveedoresDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./proveedores-carga-masiva/proveedores-carga-masiva.component').then(
        m => m.ProveedoresCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./proveedores-detail/proveedores-detail.component').then(
        m => m.ProveedoresDetailComponent,
      ),
  },
];
