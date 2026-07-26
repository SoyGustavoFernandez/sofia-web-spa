import { Route } from '@angular/router';
import { FullComponent } from '@matdash/layouts/full/full.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    component: FullComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
