import { Routes } from '@angular/router';

export const EMPRESA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./empresa-search/empresa-search.component').then(m => m.EmpresaSearchComponent),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./empresa-maintenance/empresa-maintenance.component').then(m => m.EmpresaMaintenanceComponent),
  },
];
