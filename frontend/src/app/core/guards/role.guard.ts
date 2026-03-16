import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const expectedRole = String(route.data?.['role'] ?? '').toUpperCase();

  if (!expectedRole) {
    return true;
  }

  return authService.hasRole(expectedRole) ? true : router.createUrlTree(['/auth/login']);
};
