import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const fromArray = route.data['roles'] as string[] | undefined;
  const fromSingle = route.data['role'] as string | undefined;
  const expectedRoles = (fromArray?.length ? fromArray : fromSingle ? [fromSingle] : []).map((r) =>
    String(r).toUpperCase(),
  );

  if (expectedRoles.length === 0) {
    return true;
  }

  const ok = expectedRoles.some((r) => authService.hasRole(r));
  return ok ? true : router.createUrlTree(['/auth/login']);
};
