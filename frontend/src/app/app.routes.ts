import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // 1. Rota Raiz: Redirecionamento inicial para o fluxo de entrada
  {
    path: '',
    redirectTo: 'auth/login',
    pathMatch: 'full',
  },

  // 2. Módulo de Autenticação (Público)
  // Contém Login e Autocadastro. Não precisa de guards.
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },

  // 3. Área do Cliente (Protegida)
  {
    path: 'cliente',
    // canActivate: [authGuard, roleGuard],
    data: { roles: ['CLIENTE'] }, // Definimos o perfil necessário no metadata da rota
    loadChildren: () => import('./features/cliente/cliente.routes').then((m) => m.CLIENTE_ROUTES),
  },

  // 4. Área do Gerente (Protegida)
  {
    path: 'gerente',
    // canActivate: [authGuard, roleGuard],
    data: { roles: ['GERENTE'] },
    loadChildren: () => import('./features/gerente/gerente.routes').then((m) => m.GERENTE_ROUTES),
  },

  // 5. Área do Administrador (Protegida - O "Gerente Especial")
  // Separamos as rotas para organizar melhor as telas de gestão
  {
    path: 'admin',
    // canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },

  // 6. Rota Coringa (Wildcard): Qualquer URL inválida volta para o login
  {
    path: '**',
    redirectTo: 'auth/login',
  },
];
