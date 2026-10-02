import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

export type GameId = 'tic-tac-toe' | 'connect-four';

export interface GameStats {
  played: number;
  results: Record<string, number>;
}

export type AllStats = Partial<Record<GameId, GameStats>>;

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);

  /** Global stats for all games; empty if the API isn't reachable (e.g. plain `ng serve`). */
  getStats(): Observable<AllStats> {
    return this.http.get<AllStats>('/api/stats').pipe(catchError(() => of({})));
  }

  /** Records a finished game. Fire-and-forget: a failure never affects gameplay. */
  record(game: GameId, result: string): void {
    this.http
      .post('/api/stats', { game, result })
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
