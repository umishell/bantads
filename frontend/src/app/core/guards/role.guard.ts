import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const role = route.data?.['role'];
  const roles = route.data?.['roles'];

  const expectedRoles = Array.isArray(roles)
    ? roles.map((item) => String(item).toUpperCase())
    : role
      ? [String(role).toUpperCase()]
      : [];

  if (expectedRoles.length === 0) {
    return true;
  }

  const currentRole = authService.userRole()?.toUpperCase();
  return currentRole && expectedRoles.includes(currentRole)
    ? true
    : router.createUrlTree(['/auth/login']);
};
