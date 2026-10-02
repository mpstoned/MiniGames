import { Routes } from '@angular/router';
import { adminGuard, playerGuard, signedInGuard, signedOutGuard } from './auth.guard';
import { Admin } from './admin/admin';
import { Home } from './home/home';
import { Login } from './login/login';
import { OnlineMatch } from './online-match/online-match';
import { TicTacToe } from './tic-tac-toe/tic-tac-toe';
import { ConnectFour } from './connect-four/connect-four';

const player = [signedInGuard, playerGuard];

export const routes: Routes = [
  { path: 'login', component: Login, title: 'Sign in · MiniGames', canActivate: [signedOutGuard] },
  { path: 'admin', component: Admin, title: 'Dashboard · MiniGames', canActivate: [signedInGuard, adminGuard] },
  { path: '', component: Home, title: 'MiniGames', canActivate: player },
  { path: 'tic-tac-toe', component: TicTacToe, title: 'Tic Tac Toe · MiniGames', canActivate: player },
  { path: 'connect-four', component: ConnectFour, title: 'Connect Four · MiniGames', canActivate: player },
  { path: 'play/:code', component: OnlineMatch, title: 'Online match · MiniGames', canActivate: player },
  { path: '**', redirectTo: '' },
];
