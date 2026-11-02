import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { adminGuard, authGuard } from './auth.guards';
import { AuthService } from './auth.service';

function runGuard(guard: typeof authGuard, signedIn: boolean, admin: boolean) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: { user: signal(signedIn ? { id: '1' } : null), isAdmin: signal(admin) },
      },
    ],
  });
  const result = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
}

describe('route guards', () => {
  it('sends signed-out users to login', () => {
    expect(runGuard(authGuard, false, false)).toBe('/login');
  });

  it('lets signed-in users through', () => {
    expect(runGuard(authGuard, true, false)).toBe(true);
  });

  it('keeps non-admins out of admin pages', () => {
    expect(runGuard(adminGuard, true, false)).toBe('/');
  });

  it('lets admins into admin pages', () => {
    expect(runGuard(adminGuard, true, true)).toBe(true);
  });
});
