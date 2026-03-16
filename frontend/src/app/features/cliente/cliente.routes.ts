import { Routes } from '@angular/router';

export const CLIENTE_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'transferencia',
    pathMatch: 'full',
  },
  {
    path: 'deposito',
    title: 'BANTADS - Depósito',
    loadComponent: () => import('./pages/deposito/deposito').then((m) => m.DepositoComponent),
  },
  {
    path: 'saque',
    title: 'BANTADS - Saque',
    loadComponent: () => import('./pages/saque/saque').then((m) => m.SaqueComponent),
  },
  {
    path: 'transferencia',
    title: 'BANTADS - Transferência',
    loadComponent: () =>
      import('./pages/transferencia/transferencia').then((m) => m.TransferenciaComponent),
  },
  {
    path: 'extrato',
    title: 'BANTADS - Extrato',
    loadComponent: () => import('./pages/extrato/extrato').then((m) => m.ExtratoComponent),
  },
];
