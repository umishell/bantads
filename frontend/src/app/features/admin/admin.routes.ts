import { Routes } from '@angular/router';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'BANTADS - Dashboard do Administrador',
    loadComponent: () => import('./pages/home/home').then((m) => m.AdminHomeComponent),
  },
  {
    path: 'relatorio-clientes',
    title: 'BANTADS - Relatório de Clientes',
    loadComponent: () =>
      import('./pages/relatorio-clientes/relatorio-clientes').then((m) => m.AdminRelatorioClientesComponent),
  },
  {
    path: 'gerentes',
    title: 'BANTADS - Gerentes',
    loadComponent: () => import('./pages/gerentes/gerentes').then((m) => m.AdminGerentesComponent),
  },
];
