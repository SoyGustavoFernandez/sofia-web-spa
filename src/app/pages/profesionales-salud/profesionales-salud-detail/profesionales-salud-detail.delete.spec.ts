import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { ProfesionalesSaludDetailComponent } from './profesionales-salud-detail.component';

describeDeleteInUse({
  component: ProfesionalesSaludDetailComponent,
  apiPath: 'profesionalessalud',
  route: '/profesionales-salud',
  scope: 'profesionalesSalud',
  record: { id: 'rec-1', numeroRegistro: 'CMP-1', nombrePrescriptor: 'Dra. Rios', direccionClinica: null },
});
