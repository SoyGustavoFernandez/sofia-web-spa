import { Provider } from '@angular/core';
import { AuthService } from '@core/auth/auth.service';

/** `AuthService` stub that grants exactly the given `Modulo:Accion` permissions and nothing else. */
export function providePermissions(permisos: string[]): Provider {
  return {
    provide: AuthService,
    useValue: {
      currentUser: () => null,
      hasPermission: (modulo: string, accion = 'Leer') => permisos.includes(`${modulo}:${accion}`),
    },
  };
}
