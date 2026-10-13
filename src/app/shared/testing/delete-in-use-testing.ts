import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { environment } from '@environment/environment';
import { ErrorNotifierService } from '@core/services/shared/error-notifier.service';
import { activatedRouteStub } from './activated-route-stub';
import { providePermissions } from './permissions-testing.providers';
import { stubRouterUrl } from './router-url-stub';
import { provideTranslocoTesting } from './transloco-testing.providers';

export interface DeleteInUseSpecConfig<T> {
  component: Type<T>;
  /** Controller segment under /api/v1, e.g. `medicamentos`. */
  apiPath: string;
  /** SPA route of the screen, e.g. `/medicamentos`. */
  route: string;
  /** i18n scope whose `detail.delete-in-use` / `detail.delete-error` keys the screen must use. */
  scope: string;
  record: object;
  /** Answers the requests the screen fires on init besides the record itself. */
  answerExtraRequests?: (httpMock: HttpTestingController) => void;
}

/** Registers the shared delete-flow specs of a detail screen: a 409 explains the record is in use, any other failure keeps the generic message. */
export function describeDeleteInUse<T extends { confirmDelete(): void }>(config: DeleteInUseSpecConfig<T>): void {
  const base = `${environment.api.baseurl}/api/v1/${config.apiPath}`;

  function openAndDelete(status: number) {
    const notifier = jasmine.createSpyObj<ErrorNotifierService>('ErrorNotifierService', ['showError', 'showSuccess']);
    TestBed.configureTestingModule({
      imports: [config.component],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideTranslocoTesting(),
        providePermissions([]),
        { provide: ErrorNotifierService, useValue: notifier },
        { provide: ActivatedRoute, useValue: activatedRouteStub({ id: 'rec-1' }) },
      ],
    });
    stubRouterUrl(`${config.route}/rec-1`);
    const fixture = TestBed.createComponent(config.component);
    const httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    config.answerExtraRequests?.(httpMock);
    httpMock.expectOne({ method: 'GET', url: `${base}/rec-1` }).flush(config.record);
    fixture.detectChanges();

    spyOn(fixture.debugElement.injector.get(MatDialog), 'open').and.returnValue({ afterClosed: () => of(true) } as ReturnType<MatDialog['open']>);
    fixture.componentInstance.confirmDelete();
    httpMock.expectOne({ method: 'DELETE', url: `${base}/rec-1` }).flush({}, { status, statusText: 'Error' });
    httpMock.verify();
    return notifier;
  }

  describe(`${config.component.name} — delete of a record in use`, () => {
    it('explains the record is in use when the API answers 409', () => {
      const notifier = openAndDelete(409);

      expect(notifier.showError).toHaveBeenCalledOnceWith(`${config.scope}.detail.delete-in-use`);
    });

    it('keeps the generic message for any other failure', () => {
      const notifier = openAndDelete(500);

      expect(notifier.showError).toHaveBeenCalledOnceWith(`${config.scope}.detail.delete-error`);
    });
  });
}
