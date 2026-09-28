import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, safeReturnUrl } from './auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Signed-in users skip login/register and go where they were heading (e.g. /activate/:token). */
export const guestGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  return auth.isAuthenticated()
    ? router.parseUrl(safeReturnUrl(route.queryParamMap.get('returnUrl')))
    : true;
};

/** UX only: admin data is protected by RLS and the admin_* SQL functions. */
export const adminGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.ready;
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  const profile = await auth.loadProfile();
  return profile?.role === 'admin' ? true : router.createUrlTree(['/dashboard']);
};
