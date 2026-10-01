import { Component, importProvidersFrom, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { OverlayContainer } from '@angular/cdk/overlay';
import { TablerIconsModule } from 'angular-tabler-icons';
import { provideTranslocoTesting } from '@shared/testing/transloco-testing.providers';
import { provideSofiaDates } from '@shared/date/provide-sofia-dates';
import { AuthService } from '@core/auth/auth.service';
import { HeaderComponent } from './header.component';

@Component({ standalone: true, template: '' })
class BlankComponent {}

function setup() {
  const logout = jasmine.createSpy('logout');
  const currentUser = signal({ fullName: 'Cajero QA', nombreEmpresa: 'Botica QA' });
  TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [
      provideRouter([{ path: 'cambiar-clave', component: BlankComponent }]),
      provideNoopAnimations(),
      provideTranslocoTesting(),
      importProvidersFrom(TablerIconsModule.pick({})),
      ...provideSofiaDates(),
      { provide: AuthService, useValue: { currentUser, logout } },
    ],
  });
  const fixture = TestBed.createComponent(HeaderComponent);
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const trigger = host.querySelector<HTMLButtonElement>('button.profile-btn');
  if (!trigger) throw new Error('profile trigger not rendered');
  return { fixture, trigger, logout, overlay: TestBed.inject(OverlayContainer).getContainerElement() };
}

function openProfileMenu(fixture: ComponentFixture<HeaderComponent>, trigger: HTMLButtonElement): void {
  trigger.click();
  fixture.detectChanges();
}

describe('HeaderComponent', () => {
  it('renders the profile trigger at every width with an accessible name', () => {
    const { trigger } = setup();

    expect(trigger.classList.contains('d-none')).toBeFalse();
    expect(trigger.classList.contains('d-lg-flex')).toBeFalse();
    expect(trigger.getAttribute('aria-label')).toBe('header.profileMenu');
  });

  it('shows who is signed in and offers change password and sign out in the profile menu', () => {
    const { fixture, trigger, overlay } = setup();

    openProfileMenu(fixture, trigger);

    expect(overlay.textContent).toContain('Cajero QA');
    expect(overlay.textContent).toContain('Botica QA');
    expect(overlay.textContent).toContain('header.changePassword');
    expect(overlay.textContent).toContain('header.logout');
  });

  it('signs out through AuthService from the profile menu', () => {
    const { fixture, trigger, logout, overlay } = setup();
    openProfileMenu(fixture, trigger);

    overlay.querySelector<HTMLButtonElement>('button.profile-logout-btn')?.click();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('navigates to the change password page from the profile menu', async () => {
    const { fixture, trigger, overlay } = setup();
    openProfileMenu(fixture, trigger);

    overlay.querySelector<HTMLAnchorElement>('a[mat-menu-item]')?.click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/cambiar-clave');
  });
});
