import { environment } from '@environment/environment';
import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { MedicamentosDetailComponent } from './medicamentos-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/medicamentos`;

describeDeleteInUse({
  component: MedicamentosDetailComponent,
  apiPath: 'medicamentos',
  route: '/medicamentos',
  scope: 'medicamentos',
  record: { id: 'rec-1', codigoNacional: 'COD-1', nombreComercial: 'Paracetamol', condicionVenta: 'Venta libre', precioVentaBase: 2.5, laboratorioId: 'lab-1', laboratorioNombre: 'Lab', unidadBaseId: 'u-1', unidadBaseNombre: 'Tableta' },
  answerExtraRequests: httpMock => httpMock.expectOne(`${BASE}/condiciones-venta`).flush(['Venta libre']),
});
