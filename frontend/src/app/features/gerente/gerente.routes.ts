import { Routes } from '@angular/router';

export const GERENTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'BANTADS - Pendentes (Gerente)',
    loadComponent: () =>
      import('./pages/home/gerente-home.component').then((m) => m.GerenteHomeComponent),
  },
];
