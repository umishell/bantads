import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'autocadastro',
    loadComponent: () =>
      import('./autocadastro/autocadastro.component').then((m) => m.AutocadastroComponent),
  },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
];
