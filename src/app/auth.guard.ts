import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Only lets signed-in users through; everyone else goes to the login page. */
export const signedInGuard: CanActivateFn = () =>
  !!inject(AuthService).user() || inject(Router).createUrlTree(['/login']);

/** Keeps signed-in users away from the login page. */
export const signedOutGuard: CanActivateFn = () =>
  !inject(AuthService).user() || inject(Router).createUrlTree(['/']);
