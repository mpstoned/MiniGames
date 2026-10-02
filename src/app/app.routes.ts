import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './auth.guard';
import { Home } from './home/home';
import { Login } from './login/login';
import { TicTacToe } from './tic-tac-toe/tic-tac-toe';
import { ConnectFour } from './connect-four/connect-four';

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in · MiniGames', canActivate: [signedOutGuard] },
  { path: '', component: Home, title: 'MiniGames', canActivate: [signedInGuard] },
  { path: 'tic-tac-toe', component: TicTacToe, title: 'Tic Tac Toe · MiniGames', canActivate: [signedInGuard] },
  { path: 'connect-four', component: ConnectFour, title: 'Connect Four · MiniGames', canActivate: [signedInGuard] },
  { path: '**', redirectTo: '' },
];
