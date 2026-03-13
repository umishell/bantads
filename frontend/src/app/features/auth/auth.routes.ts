import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      },
      {
        path: 'login',
        title: 'BANTADS - Login',
        loadComponent: () => 
          import('./login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'autocadastro',
        title: 'BANTADS - Abra sua conta',
        // Requisito R1: Página de autocadastro acessível sem login
        loadComponent: () => 
          import('./autocadastro/autocadastro.component').then(c => c.AutocadastroComponent)
      }
    ]
  }
];