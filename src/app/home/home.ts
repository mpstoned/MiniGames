import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { AllStats, GameId, StatsService } from '../stats.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <main>
      <h1>Welcome, {{ user() }}!</h1>
      <p class="subtitle">Choose a game</p>
      <div class="games">
        @for (game of games; track game.path) {
          <a class="card" [routerLink]="game.path">
            <span class="icon">{{ game.icon }}</span>
            <span class="name">{{ game.name }}</span>
            <span class="desc">{{ game.description }}</span>
            @if (stats()[game.id]; as s) {
              <span class="stats">
                Played {{ s.played }} {{ s.played === 1 ? 'time' : 'times' }}<br />
                {{ breakdown(game.labels, s.results) }}
              </span>
            }
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
      text-align: center;
    }
    .subtitle {
      margin: -1.25rem 0 0;
      font-size: 1.2rem;
      color: #94a3b8;
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
    .stats {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px solid #334155;
      width: 100%;
      font-size: 0.85rem;
      color: #cbd5e1;
      text-align: center;
      line-height: 1.5;
    }
  `,
})
export class Home {
  protected readonly user = inject(AuthService).user;
  protected readonly stats = toSignal(inject(StatsService).getStats(), { initialValue: {} as AllStats });

  protected readonly games: { id: GameId; path: string; icon: string; name: string; description: string; labels: Record<string, string> }[] = [
    {
      id: 'tic-tac-toe',
      path: '/tic-tac-toe',
      icon: '❌⭕',
      name: 'Tic Tac Toe',
      description: 'Get three in a row on a 3×3 grid.',
      labels: { X: 'X wins', O: 'O wins', draw: 'Draws' },
    },
    {
      id: 'connect-four',
      path: '/connect-four',
      icon: '🔴🟡',
      name: 'Connect Four',
      description: 'Drop discs and connect four in a row.',
      labels: { red: 'Red wins', yellow: 'Yellow wins', draw: 'Draws' },
    },
  ];

  protected breakdown(labels: Record<string, string>, results: Record<string, number>): string {
    return Object.entries(labels)
      .map(([key, label]) => `${label}: ${results[key] ?? 0}`)
      .join(' · ');
  }
}
