import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { SucursalesDetailComponent } from './sucursales-detail.component';

describeDeleteInUse({
  component: SucursalesDetailComponent,
  apiPath: 'sucursales',
  route: '/sucursales',
  scope: 'sucursales',
  record: { id: 'rec-1', nombre: 'Sede', direccionFisica: 'Av. Uno 123', numeroLicencia: 'LIC-1', gerenteId: null, gerenteNombre: null },
});
