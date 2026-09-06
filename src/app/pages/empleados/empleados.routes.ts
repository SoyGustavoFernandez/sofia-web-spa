import { Route } from '@angular/router';

export const EMPLEADOS_ROUTES: Route[] = [
  {
    path: '',
    loadComponent: () =>
      import('./empleados-search/empleados-search.component').then(
        m => m.EmpleadosSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./empleados-detail/empleados-detail.component').then(
        m => m.EmpleadosDetailComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./empleados-detail/empleados-detail.component').then(
        m => m.EmpleadosDetailComponent,
      ),
  },
];
