import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { environment } from '@environment/environment';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { providePermissions } from '@shared/testing/permissions-testing.providers';
import { stubRouterUrl } from '@shared/testing/router-url-stub';
import { UnidadVendible } from '../../jerarquias/models/jerarquia-uom.model';
import { PresentacionVenta } from '../models/presentacion-venta.model';
import { PresentacionesVentaModalComponent, PresentacionesVentaModalData } from './presentaciones-venta-modal.component';

const API = `${environment.api.baseurl}/api/v1`;

const UNIDADES: UnidadVendible[] = [
  { unidadMedidaId: 'um-caja', descripcion: 'Caja', cantidadUnidadesBase: 10 },
  { unidadMedidaId: 'um-blister', descripcion: 'Blister', cantidadUnidadesBase: 5 },
];

const PRESENTACION: PresentacionVenta = {
  id: 'pres-1',
  productoId: 'med-1',
  productoNombre: 'Paracetamol',
  unidadVentaId: 'um-caja',
  descripcion: 'Caja',
  cantidadUnidadesBase: 10,
  precioVenta: 20,
};

// The dialog opens over /medicamentos/:id, so its buttons must not inherit the Medicamentos module
function setup(permisos: string[], unidades: UnidadVendible[] = UNIDADES) {
  const data: PresentacionesVentaModalData = { productoId: 'med-1', productoNombre: 'Paracetamol', unidadBaseNombre: 'Tableta' };
  TestBed.configureTestingModule({
    imports: [PresentacionesVentaModalComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      providePermissions(permisos),
      { provide: MatDialogRef, useValue: { close: () => undefined } },
      { provide: MAT_DIALOG_DATA, useValue: data },
    ],
  });
  stubRouterUrl('/medicamentos/med-1');
  const fixture = TestBed.createComponent(PresentacionesVentaModalComponent);
  const httpMock = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  httpMock.expectOne(r => r.url === `${API}/jerarquiasuom/unidades-vendibles`).flush(unidades);
  const items = unidades.length > 0 ? [PRESENTACION] : [];
  httpMock.expectOne(r => r.url === `${API}/presentacionesventa`).flush({ items, pageNumber: 1, totalPages: 1, totalCount: items.length });
  fixture.detectChanges();
  httpMock.verify();
  const host = fixture.nativeElement as HTMLElement;
  return Array.from(host.querySelectorAll('button')).map(b => b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '');
}

describe('PresentacionesVentaModalComponent — action buttons', () => {
  it('lists the presentations without any write action for a user who can only read them', () => {
    const labels = setup(['Medicamentos:Actualizar', 'Medicamentos:Eliminar', 'Medicamentos:Crear', 'PresentacionesVenta:Leer']);

    expect(labels).toEqual(['presentacionesVenta.modal.close-btn']);
  });

  it('offers each write action only with its own PresentacionesVenta permission', () => {
    expect(setup(['PresentacionesVenta:Actualizar'])).toContain('presentacionesVenta.modal.edit-tooltip');
    TestBed.resetTestingModule();
    expect(setup(['PresentacionesVenta:Eliminar'])).toContain('presentacionesVenta.modal.delete-tooltip');
    TestBed.resetTestingModule();

    const conCrear = setup(['PresentacionesVenta:Crear']).join('|');

    expect(conCrear).toContain('presentacionesVenta.modal.add-btn');
    expect(conCrear).not.toContain('presentacionesVenta.modal.edit-tooltip');
    expect(conCrear).not.toContain('presentacionesVenta.modal.delete-tooltip');
  });

  it('links to creating a unit hierarchy only with JerarquiasUoM:Crear', () => {
    expect(setup(['JerarquiasUoM:Crear'], []).join('|')).toContain('presentacionesVenta.modal.ir-a-jerarquias-btn');
    TestBed.resetTestingModule();

    expect(setup(['JerarquiasUoM:Leer', 'PresentacionesVenta:Crear'], []).join('|')).not.toContain('presentacionesVenta.modal.ir-a-jerarquias-btn');
  });
});
