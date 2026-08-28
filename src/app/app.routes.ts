import { Route } from '@angular/router';
import { FullComponent } from '@matdash/layouts/full/full.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/empresa/empresa-register/empresa-register.component').then(
        m => m.EmpresaRegisterComponent
      ),
  },
  {
    path: '',
    component: FullComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      {
        path: 'empresas',
        loadChildren: () =>
          import('./pages/empresa/empresa.routes').then(m => m.EMPRESA_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
