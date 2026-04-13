import { Routes } from '@angular/router';

export const GERENTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    title: 'BANTADS - Home do Gerente',
    loadComponent: () => import('./pages/home/home').then((m) => m.GerenteHomeComponent),
  },
  {
    path: 'clientes',
    title: 'BANTADS - Clientes do Gerente',
    loadComponent: () => import('./pages/clientes/clientes').then((m) => m.GerenteClientesComponent),
  },
  {
    path: 'consulta',
    title: 'BANTADS - Consulta de Cliente',
    loadComponent: () => import('./pages/consulta/consulta').then((m) => m.GerenteConsultaComponent),
  },
  {
    path: 'melhores-clientes',
    title: 'BANTADS - Melhores Clientes',
    loadComponent: () =>
      import('./pages/melhores-clientes/melhores-clientes').then((m) => m.GerenteMelhoresClientesComponent),
  },
];
