import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main>
      <h1>Choose a game</h1>
      <div class="games">
        @for (game of games; track game.path) {
          <a class="card" [routerLink]="game.path">
            <span class="icon">{{ game.icon }}</span>
            <span class="name">{{ game.name }}</span>
            <span class="desc">{{ game.description }}</span>
          </a>
        }
      </div>
    </main>
  `,
  styles: `
    main {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      padding: 2rem 1rem;
    }
    h1 {
      margin: 0;
      font-size: 2.5rem;
    }
    .games {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      width: min(100%, 500px);
    }
    .card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.75rem 1rem;
      border-radius: 16px;
      background: #1e293b;
      color: inherit;
      text-decoration: none;
      transition: background 0.15s, transform 0.15s;
    }
    .card:hover {
      background: #334155;
      transform: translateY(-3px);
    }
    .icon {
      font-size: 3rem;
    }
    .name {
      font-size: 1.3rem;
      font-weight: 700;
    }
    .desc {
      color: #94a3b8;
      text-align: center;
    }
  `,
})
export class Home {
  protected readonly games = [
    { path: '/tic-tac-toe', icon: '❌⭕', name: 'Tic Tac Toe', description: 'Get three in a row on a 3×3 grid.' },
    { path: '/connect-four', icon: '🔴🟡', name: 'Connect Four', description: 'Drop discs and connect four in a row.' },
  ];
}
