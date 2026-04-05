import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/**
 * Rotas só para visitante (ex.: login). Se já há sessão válida, manda para a home do perfil.
 */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.getToken() !== null && auth.isAccessTokenExpired()) {
    auth.logout();
    return true;
  }

  if (auth.isAuthenticated() && !auth.isAccessTokenExpired()) {
    return router.parseUrl(auth.getHomeUrl());
  }

  return true;
};
