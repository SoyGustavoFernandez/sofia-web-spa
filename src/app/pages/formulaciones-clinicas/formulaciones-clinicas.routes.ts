import { Routes } from '@angular/router';

export const FORMULACIONES_CLINICAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./formulaciones-clinicas-search/formulaciones-clinicas-search.component').then(
        m => m.FormulacionesClinicasSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./formulaciones-clinicas-detail/formulaciones-clinicas-detail.component').then(
        m => m.FormulacionesClinicasDetailComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./formulaciones-clinicas-detail/formulaciones-clinicas-detail.component').then(
        m => m.FormulacionesClinicasDetailComponent,
      ),
  },
];
