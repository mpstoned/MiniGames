import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { MatchService } from '../match.service';
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
          <div class="card">
            <span class="icon">{{ game.icon }}</span>
            <span class="name">{{ game.name }}</span>
            <span class="desc">{{ game.description }}</span>
            <div class="actions">
              <a class="action" [routerLink]="game.path">Same device</a>
              <button class="action primary" [disabled]="busy()" (click)="playOnline(game.id)">Play online</button>
            </div>
            @if (stats()[game.id]; as s) {
              <span class="stats">
                Played {{ s.played }} {{ s.played === 1 ? 'time' : 'times' }}<br />
                {{ breakdown(game.labels, s.results) }}
              </span>
            }
          </div>
        }
      </div>

      <form class="join" (submit)="join($event)">
        <label for="code">Got a code from a friend?</label>
        <div class="join-row">
          <input
            id="code"
            name="code"
            [value]="code()"
            (input)="code.set($any($event.target).value)"
            placeholder="ABCDE"
            maxlength="5"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
          />
          <button class="action primary" type="submit" [disabled]="code().trim().length !== 5">Join</button>
        </div>
      </form>

      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
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
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }
    .action {
      padding: 0.45rem 0.9rem;
      border: 1px solid #6366f1;
      border-radius: 999px;
      background: transparent;
      color: #c7d2fe;
      font: inherit;
      font-size: 0.9rem;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
    }
    .action:hover {
      background: #312e81;
    }
    .action.primary {
      border-color: transparent;
      background: #6366f1;
      color: #fff;
    }
    .action.primary:hover {
      background: #4f46e5;
    }
    .action:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .join {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin-top: -0.5rem;
    }
    .join label {
      color: #94a3b8;
    }
    .join-row {
      display: flex;
      gap: 0.5rem;
    }
    .join input {
      width: 7.5rem;
      padding: 0.45rem 0.8rem;
      border: 1px solid #334155;
      border-radius: 999px;
      background: #0f172a;
      color: inherit;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 1rem;
      letter-spacing: 0.2em;
      text-align: center;
      text-transform: uppercase;
    }
    .join input:focus {
      outline: 2px solid #6366f1;
      outline-offset: 1px;
    }
    .error {
      margin: -1rem 0 0;
      color: #f87171;
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
  private readonly matches = inject(MatchService);
  private readonly router = inject(Router);

  protected readonly user = inject(AuthService).user;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly code = signal('');
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

  /** Starts an online match and opens it; the page shows the code to share. */
  protected async playOnline(game: GameId): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const match = await this.matches.create(game);
      await this.router.navigate(['/play', match.code]);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected join(event: Event): void {
    event.preventDefault();
    this.router.navigate(['/play', this.code().trim().toUpperCase()]);
  }
}
