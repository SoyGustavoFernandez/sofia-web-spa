import { Routes } from '@angular/router';

export const PROFESIONALES_SALUD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./profesionales-salud-search/profesionales-salud-search.component').then(
        m => m.ProfesionalesSaludSearchComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./profesionales-salud-detail/profesionales-salud-detail.component').then(
        m => m.ProfesionalesSaludDetailComponent,
      ),
  },
  {
    path: 'carga-masiva',
    loadComponent: () =>
      import('./profesionales-salud-carga-masiva/profesionales-salud-carga-masiva.component').then(
        m => m.ProfesionalesSaludCargaMasivaComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./profesionales-salud-detail/profesionales-salud-detail.component').then(
        m => m.ProfesionalesSaludDetailComponent,
      ),
  },
];
