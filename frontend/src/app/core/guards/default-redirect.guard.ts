import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

/** Rota raiz `/`: login se não autenticado; home do perfil se sessão válida. */
export const defaultRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.getToken();
  if (token !== null && auth.isAccessTokenExpired()) {
    auth.logout();
    return router.parseUrl('/auth/login');
  }

  if (auth.isAuthenticated() && !auth.isAccessTokenExpired()) {
    return router.parseUrl(auth.getHomeUrl());
  }

  return router.parseUrl('/auth/login');
};
