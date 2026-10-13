import { environment } from '@environment/environment';
import { describeDeleteInUse } from '@shared/testing/delete-in-use-testing';
import { ProveedoresDetailComponent } from './proveedores-detail.component';

const BASE = `${environment.api.baseurl}/api/v1/proveedores`;

describeDeleteInUse({
  component: ProveedoresDetailComponent,
  apiPath: 'proveedores',
  route: '/proveedores',
  scope: 'proveedores',
  record: { id: 'rec-1', razonSocial: 'Distribuidora SAC', taxId: '20100000001', terminosFinancieros: null, calificacionEsg: null, tasaCumplimiento: 100 },
  answerExtraRequests: httpMock => httpMock.expectOne(r => r.url === `${BASE}/rec-1/precios`).flush({ items: [], pageNumber: 1, totalPages: 1, totalCount: 0 }),
});
