import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./roles-search/roles-search.component').then(m => m.RolesSearchComponent),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./roles-detail/roles-detail.component').then(m => m.RolesDetailComponent),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./roles-carga-masiva/roles-carga-masiva.component').then(
        m => m.RolesCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./roles-detail/roles-detail.component').then(m => m.RolesDetailComponent),
  },
];
