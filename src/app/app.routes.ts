import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in | Account Utility',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./features/shell/shell').then((m) => m.Shell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Process accounts | Account Utility',
        loadComponent: () => import('./features/process/process').then((m) => m.Process),
      },
      {
        path: 'admin/users',
        canActivate: [adminGuard],
        title: 'Users | Account Utility',
        loadComponent: () => import('./features/users/users').then((m) => m.Users),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
