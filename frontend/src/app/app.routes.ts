import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },


  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  
  {
    path: 'cliente',
    loadChildren: () => import('./features/cliente/cliente.routes').then(m => m.CLIENTE_ROUTES),
    canActivate: [authGuard, roleGuard],
    data: { role: 'CLIENTE' }
  },

 
  {
    path: 'gerente',
    loadChildren: () => import('./features/gerente/gerente.routes').then(m => m.GERENTE_ROUTES),
    canActivate: [authGuard, roleGuard],
    data: { role: 'GERENTE' }
  },


  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
    canActivate: [authGuard, roleGuard],
    data: { role: 'ADMIN' }
  },

  // Rota de erro ou 404 
  { path: '**', redirectTo: 'auth/login' }
];