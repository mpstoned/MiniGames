import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Only lets signed-in users through; everyone else goes to the login page,
 * which brings them back afterwards (e.g. to a match link from a friend).
 */
export const signedInGuard: CanActivateFn = (_route, state) =>
  !!inject(AuthService).user() ||
  inject(Router).createUrlTree(['/login'], { queryParams: state.url === '/' ? {} : { returnUrl: state.url } });

/** Keeps signed-in users away from the login page. */
export const signedOutGuard: CanActivateFn = () =>
  !inject(AuthService).user() || inject(Router).createUrlTree(['/']);

/** Game pages are for players; the admin is sent to the dashboard. */
export const playerGuard: CanActivateFn = () =>
  !inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/admin']);

/** The dashboard is for the admin only. */
export const adminGuard: CanActivateFn = () =>
  inject(AuthService).isAdmin() || inject(Router).createUrlTree(['/']);
