import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'login',
        title: 'BANTADS - Login',
        loadComponent: () => 
          import('./login/login.component').then(c => c.LoginComponent)
      },
      {
        path: 'autocadastro',
        title: 'BANTADS - Abra sua conta',
        // Requisito R1: Autocadastro acessível sem login
        loadComponent: () => 
          import('./autocadastro/autocadastro.component').then(c => c.AutocadastroComponent)
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  }
];