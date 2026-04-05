import { Routes } from '@angular/router';

import { guestGuard } from '../../core/guards/guest.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      { 
        path: '', 
        redirectTo: 'login', 
        pathMatch: 'full' 
      },
  
      {// 2. Rota de Login: Carregamento sob demanda (Lazy Loading) do componente

        path: 'login',
        title: 'BANTADS - Login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./login/login.component').then((m) => m.LoginComponent),
      },
    
            {// 3. Rota de Autocadastro
        path: 'autocadastro',
        title: 'BANTADS - Abra sua conta',
        loadComponent: () =>
          import('./autocadastro/autocadastro.component').then((m) => m.AutocadastroComponent),
      },
    ],
  },
];

/*

FUTURO< comentado porque o login e autocad ainda não foram commitados.

import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        title: 'BANTADS - Login',
        loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'autocadastro',
        title: 'BANTADS - Abra sua conta',
        loadComponent: () =>
          import('./autocadastro/autocadastro.component').then((m) => m.AutocadastroComponent),
      },
    ],
  },
];
*/
