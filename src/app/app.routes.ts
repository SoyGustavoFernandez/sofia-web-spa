import { Route } from '@angular/router';
import { FullComponent } from '@matdash/layouts/full/full.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from '@core/auth/auth.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'auth/login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then(m => m.LoginComponent),
  },
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
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
      },
      // Administración
      {
        path: 'sucursales',
        loadChildren: () =>
          import('./pages/sucursales/sucursales.routes').then(m => m.SUCURSALES_ROUTES),
      },
      {
        path: 'empresas',
        loadChildren: () =>
          import('./pages/empresa/empresa.routes').then(m => m.EMPRESA_ROUTES),
      },
      {
        path: 'empleados',
        loadChildren: () =>
          import('./pages/empleados/empleados.routes').then(m => m.EMPLEADOS_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () =>
          import('./pages/roles/roles.routes').then(m => m.ROLES_ROUTES),
      },
      {
        path: 'cuentas',
        loadChildren: () =>
          import('./pages/seguridad/cuentas.routes').then(m => m.CUENTAS_ROUTES),
      },
      // Catálogos
      {
        path: 'unidades-medida',
        loadChildren: () =>
          import('./pages/unidades-medida/unidades-medida.routes').then(m => m.UNIDADES_MEDIDA_ROUTES),
      },
      {
        path: 'jerarquias',
        loadChildren: () =>
          import('./pages/jerarquias/jerarquias.routes').then(m => m.JERARQUIAS_ROUTES),
      },
      {
        path: 'laboratorios',
        loadChildren: () =>
          import('./pages/laboratorios/laboratorios.routes').then(m => m.LABORATORIOS_ROUTES),
      },
      {
        path: 'ingredientes-activos',
        loadChildren: () =>
          import('./pages/ingredientes-activos/ingredientes-activos.routes').then(m => m.INGREDIENTES_ACTIVOS_ROUTES),
      },
      {
        path: 'medicamentos',
        loadChildren: () =>
          import('./pages/medicamentos/medicamentos.routes').then(m => m.MEDICAMENTOS_ROUTES),
      },
      {
        path: 'proveedores',
        loadChildren: () =>
          import('./pages/proveedores/proveedores.routes').then(m => m.PROVEEDORES_ROUTES),
      },
      {
        path: 'aseguradoras',
        loadChildren: () =>
          import('./pages/aseguradoras/aseguradoras.routes').then(m => m.ASEGURADORAS_ROUTES),
      },
      // Pacientes & Atención
      {
        path: 'pacientes',
        loadChildren: () =>
          import('./pages/pacientes/pacientes.routes').then(m => m.PACIENTES_ROUTES),
      },
      {
        path: 'profesionales-salud',
        loadChildren: () =>
          import('./pages/profesionales-salud/profesionales-salud.routes').then(m => m.PROFESIONALES_SALUD_ROUTES),
      },
      // DIGEMID
      {
        path: 'digemid-catalogo',
        loadChildren: () =>
          import('./pages/digemid-catalogo/digemid-catalogo.routes').then(m => m.DIGEMID_CATALOGO_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
