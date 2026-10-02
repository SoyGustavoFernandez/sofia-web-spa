import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

/** Pins `Router.url` so `*appPermiso` resolves the module of the screen under test. */
export function stubRouterUrl(url: string): void {
  spyOnProperty(TestBed.inject(Router), 'url', 'get').and.returnValue(url);
}
