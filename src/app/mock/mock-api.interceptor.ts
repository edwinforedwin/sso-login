import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { defer, delay, from, map, Observable, of, switchMap, throwError } from 'rxjs';
import { parseAccountFile } from '../core/account-file';
import { AccountJob, NewUser, User } from '../core/models';
import { buildMockWorkbook } from './mock-workbook';

/**
 * Development-only stand-in for the backend described in README.md. Users and the
 * session are kept in localStorage; jobs live in memory and vanish on reload.
 * Nothing here is secure, and it is excluded from production builds.
 */
type StoredUser = User & { password: string };
type StoredJob = AccountJob & { ownerId: string; accounts: string[] };

const USERS_KEY = 'mock-api.users';
const SESSION_KEY = 'mock-api.session';
const ACCOUNTS_PER_SECOND = 400;
const MIN_JOB_MS = 4000;

const SEED_USERS: StoredUser[] = [
  {
    id: 'u1',
    name: 'Dev Admin',
    email: 'admin@example.com',
    role: 'admin',
    active: true,
    password: 'Admin123!',
  },
  {
    id: 'u2',
    name: 'Dev User',
    email: 'user@example.com',
    role: 'user',
    active: true,
    password: 'User123!',
  },
];

const jobs: StoredJob[] = [];

function loadUsers(): StoredUser[] {
  const stored = localStorage.getItem(USERS_KEY);
  return stored ? (JSON.parse(stored) as StoredUser[]) : SEED_USERS;
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toUser({ password: _password, ...user }: StoredUser): User {
  return user;
}

function currentUser(): StoredUser | undefined {
  const id = localStorage.getItem(SESSION_KEY);
  return loadUsers().find((user) => user.id === id && user.active);
}

function ok<T>(body: T) {
  return of(new HttpResponse({ status: 200, body }));
}

function fail(status: number, message: string) {
  return throwError(() => new HttpErrorResponse({ status, error: { message } }));
}

function toPublicJob(job: StoredJob): AccountJob {
  const started = new Date(job.createdAt).getTime();
  const duration = Math.max(MIN_JOB_MS, (job.totalAccounts / ACCOUNTS_PER_SECOND) * 1000);
  const fraction = Math.min(1, (Date.now() - started) / duration);
  const processed = Math.floor(job.totalAccounts * fraction);
  return {
    id: job.id,
    fileName: job.fileName,
    totalAccounts: job.totalAccounts,
    createdAt: job.createdAt,
    processedAccounts: processed,
    status: fraction >= 1 ? 'completed' : 'processing',
  };
}

function handleAuth(request: HttpRequest<unknown>): Observable<HttpResponse<unknown>> {
  if (request.url === '/api/auth/login') {
    const { email, password } = request.body as { email: string; password: string };
    const user = loadUsers().find(
      (candidate) =>
        candidate.email.toLowerCase() === email.trim().toLowerCase() &&
        candidate.password === password &&
        candidate.active,
    );
    if (!user) {
      return fail(401, 'Email or password is incorrect.');
    }
    localStorage.setItem(SESSION_KEY, user.id);
    return ok(toUser(user));
  }
  if (request.url === '/api/auth/logout') {
    localStorage.removeItem(SESSION_KEY);
    return ok(null);
  }
  const user = currentUser();
  return user ? ok(toUser(user)) : fail(401, 'Not signed in.');
}

function handleUsers(
  request: HttpRequest<unknown>,
  me: StoredUser,
): Observable<HttpResponse<unknown>> {
  if (me.role !== 'admin') {
    return fail(403, 'Administrator access is required.');
  }
  const users = loadUsers();
  if (request.method === 'GET') {
    return ok(users.map(toUser));
  }
  if (request.method === 'POST') {
    const body = request.body as NewUser;
    const email = body.email.trim();
    if (users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      return fail(409, 'A user with this email already exists.');
    }
    const created: StoredUser = {
      id: crypto.randomUUID(),
      name: body.name.trim(),
      email,
      role: body.role,
      active: true,
      password: body.temporaryPassword,
    };
    saveUsers([...users, created]);
    return ok(toUser(created));
  }
  const id = decodeURIComponent(request.url.split('/').pop() ?? '');
  const target = users.find((user) => user.id === id);
  if (!target) {
    return fail(404, 'User not found.');
  }
  if (target.id === me.id) {
    return fail(400, 'You cannot deactivate your own account.');
  }
  target.active = (request.body as { active: boolean }).active;
  saveUsers(users);
  return ok(toUser(target));
}

function handleJobs(
  request: HttpRequest<unknown>,
  me: StoredUser,
): Observable<HttpResponse<unknown>> {
  if (request.method === 'POST') {
    const file = (request.body as FormData).get('file') as File;
    return from(file.text()).pipe(
      switchMap((text) => {
        const { accounts } = parseAccountFile(text);
        if (!accounts.length) {
          return fail(400, 'The file has no valid account numbers.');
        }
        const job: StoredJob = {
          id: crypto.randomUUID(),
          ownerId: me.id,
          fileName: file.name,
          status: 'queued',
          totalAccounts: accounts.length,
          processedAccounts: 0,
          createdAt: new Date().toISOString(),
          accounts,
        };
        jobs.unshift(job);
        return ok(toPublicJob(job));
      }),
    );
  }

  const mine = jobs.filter((job) => job.ownerId === me.id);
  const download = request.url.match(/^\/api\/jobs\/([^/]+)\/download$/);
  if (!download) {
    return ok(mine.map(toPublicJob));
  }
  const job = mine.find((candidate) => candidate.id === decodeURIComponent(download[1]));
  if (!job || toPublicJob(job).status !== 'completed') {
    return fail(404, 'This file is not available.');
  }
  return from(buildMockWorkbook(job.accounts)).pipe(
    map((body) => new HttpResponse({ status: 200, body })),
  );
}

export const mockApiInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith('/api/')) {
    return next(request);
  }
  return defer(() => {
    if (request.url.startsWith('/api/auth/')) {
      return handleAuth(request);
    }
    const me = currentUser();
    if (!me) {
      return fail(401, 'Not signed in.');
    }
    return request.url.startsWith('/api/users')
      ? handleUsers(request, me)
      : handleJobs(request, me);
  }).pipe(delay(200));
};
