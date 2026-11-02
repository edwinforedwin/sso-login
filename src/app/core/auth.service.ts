import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, firstValueFrom, Observable, of, tap } from 'rxjs';
import { User } from './models';

/**
 * The session lives in an HttpOnly cookie set by the backend, so no token is ever
 * readable from JavaScript. This service only tracks who the backend says is signed in.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  /** Runs once at startup so a page reload keeps the user signed in. */
  restore(): Promise<unknown> {
    return firstValueFrom(
      this.http.get<User>('/api/auth/me').pipe(
        tap((user) => this.currentUser.set(user)),
        catchError(() => of(null)),
      ),
    );
  }

  login(email: string, password: string): Observable<User> {
    return this.http
      .post<User>('/api/auth/login', { email, password })
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', null).pipe(tap(() => this.clear()));
  }

  clear(): void {
    this.currentUser.set(null);
  }
}
