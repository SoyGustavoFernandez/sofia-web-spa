import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { PacientesDetailComponent } from './pacientes-detail.component';

describeDeleteInUse({
  component: PacientesDetailComponent,
  apiPath: 'pacientes',
  route: '/pacientes',
  scope: 'pacientes',
  record: { id: 'rec-1', tipoDocumento: 'Dni', docIdentidadGub: '12345678', nombreApellidos: 'Juan Perez', fechaNacimiento: '1990-01-01', contactoPrimario: null },
});
