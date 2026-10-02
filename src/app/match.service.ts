import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { GameId } from './stats.service';

export type Seat = 'first' | 'second';

/** An online match as the API returns it. `first` always starts; seats swap on rematch. */
export interface Match {
  code: string;
  game: GameId;
  players: Record<Seat, string | null>;
  board: (Seat | null)[];
  turn: Seat;
  status: 'waiting' | 'playing' | 'finished';
  winner: Seat | null;
  winLine: number[] | null;
  round: number;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class MatchService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  create(game: GameId): Promise<Match> {
    return this.call(this.http.post<Match>('/api/matches', { game, player: this.auth.user() }));
  }

  get(code: string): Promise<Match> {
    return this.call(this.http.get<Match>(`/api/matches/${encodeURIComponent(code)}`));
  }

  join(code: string): Promise<Match> {
    return this.call(this.http.post<Match>(`/api/matches/${encodeURIComponent(code)}/join`, { player: this.auth.user() }));
  }

  move(code: string, move: number): Promise<Match> {
    return this.call(
      this.http.post<Match>(`/api/matches/${encodeURIComponent(code)}/move`, { player: this.auth.user(), move }),
    );
  }

  rematch(code: string, round: number): Promise<Match> {
    return this.call(
      this.http.post<Match>(`/api/matches/${encodeURIComponent(code)}/rematch`, { player: this.auth.user(), round }),
    );
  }

  /** Turns API errors into readable messages. */
  private async call(request: Observable<Match>): Promise<Match> {
    try {
      return await firstValueFrom(request);
    } catch (err) {
      const message =
        err instanceof HttpErrorResponse && typeof err.error?.error === 'string'
          ? err.error.error
          : 'Connection problem. Please try again.';
      throw new Error(message);
    }
  }
}
