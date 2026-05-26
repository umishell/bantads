import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

function expectedRoleFromRoute(route: ActivatedRouteSnapshot): string | null {
  const data = route.data;
  if (typeof data['role'] === 'string' && data['role']) {
    return data['role'];
  }
  const roles = data['roles'];
  if (Array.isArray(roles) && roles.length > 0 && typeof roles[0] === 'string') {
    return roles[0];
  }
  return null;
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  let current: ActivatedRouteSnapshot | null = route;
  let expectedRole: string | null = null;
  while (current && !expectedRole) {
    expectedRole = expectedRoleFromRoute(current);
    current = current.parent;
  }

  if (!expectedRole) {
    return true;
  }

  return authService.hasRole(expectedRole) ? true : router.createUrlTree(['/auth/login']);
};
