import { Routes } from '@angular/router';
import { Home } from './home/home';
import { TicTacToe } from './tic-tac-toe/tic-tac-toe';
import { ConnectFour } from './connect-four/connect-four';

export const routes: Routes = [
  { path: '', component: Home, title: 'MiniGames' },
  { path: 'tic-tac-toe', component: TicTacToe, title: 'Tic Tac Toe · MiniGames' },
  { path: 'connect-four', component: ConnectFour, title: 'Connect Four · MiniGames' },
  { path: '**', redirectTo: '' },
];
