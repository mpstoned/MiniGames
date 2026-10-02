import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';
import { AuthService } from './auth.service';

export type GameId = 'tic-tac-toe' | 'connect-four';

export interface GameStats {
  played: number;
  results: Record<string, number>;
}

export type AllStats = Partial<Record<GameId, GameStats>>;

export interface Dashboard {
  games: Record<GameId, GameStats>;
  daily: { date: string; games: Record<GameId, number> }[];
  users: {
    username: string;
    createdAt: string;
    lastSeenAt: string;
    signIns: number;
    games: Record<GameId, number>;
  }[];
}

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Global stats for all games; empty if the API isn't reachable (e.g. plain `ng serve`). */
  getStats(): Observable<AllStats> {
    return this.http.get<AllStats>('/api/stats').pipe(catchError(() => of({})));
  }

  /** Records a finished game. Fire-and-forget: a failure never affects gameplay. */
  record(game: GameId, result: string): void {
    this.http
      .post('/api/stats', { game, result, player: this.auth.user() })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }

  /** Everything the admin dashboard shows. */
  getDashboard(): Observable<Dashboard> {
    return this.http.get<Dashboard>('/api/dashboard', { headers: { 'x-username': this.auth.user() ?? '' } });
  }
}
