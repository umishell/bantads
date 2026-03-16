import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'cliente',
    loadChildren: () => import('./features/cliente/cliente.routes').then((m) => m.CLIENTE_ROUTES),
    //Comentado para poder acessar as rotas de cliente sem precisar de login, para facilitar o desenvolvimento. Depois deve ser descomentado e testado.
    //  canActivate: [authGuard, roleGuard],
    //  data: { role: 'CLIENTE' },
  },
  {
    path: 'gerente',
    loadChildren: () => import('./features/gerente/gerente.routes').then((m) => m.GERENTE_ROUTES),
    //Comentado para poder acessar as rotas de cliente sem precisar de login, para facilitar o desenvolvimento. Depois deve ser descomentado e testado.
    //  canActivate: [authGuard, roleGuard],
    //  data: { role: 'GERENTE' },
  },
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
