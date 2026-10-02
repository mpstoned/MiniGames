import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ConnectFourBoard, ConnectFourCell } from '../connect-four/connect-four-board';
import { Match, MatchService, Seat } from '../match.service';
import { TicTacToeBoard, TicTacToeCell } from '../tic-tac-toe/tic-tac-toe-board';

const POLL_MS = 1000;

/** How each seat is shown: the first seat plays X / red and always starts. */
const MARKS = {
  'tic-tac-toe': { first: 'X', second: 'O' },
  'connect-four': { first: 'red', second: 'yellow' },
} as const;

const GAME_NAMES = { 'tic-tac-toe': 'Tic Tac Toe', 'connect-four': 'Connect Four' };

@Component({
  selector: 'app-online-match',
  imports: [RouterLink, TicTacToeBoard, ConnectFourBoard],
  templateUrl: './online-match.html',
  styleUrl: './online-match.css',
})
export class OnlineMatch {
  private readonly matches = inject(MatchService);
  private readonly auth = inject(AuthService);
  protected readonly code = (inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '').toUpperCase();

  protected readonly match = signal<Match | null>(null);
  protected readonly error = signal<string | null>(null);
  /** A fatal problem (match not found or full): stop polling and show only the message. */
  protected readonly fatal = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);

  protected readonly seats: Seat[] = ['first', 'second'];
  protected readonly link = `${location.origin}/play/${this.code}`;
  protected readonly gameName = computed(() => {
    const m = this.match();
    return m ? GAME_NAMES[m.game] : 'Online match';
  });

  protected readonly mySeat = computed<Seat | null>(() => {
    const m = this.match();
    const me = this.auth.user()?.toLowerCase();
    if (!m || !me) return null;
    if (m.players.first?.toLowerCase() === me) return 'first';
    if (m.players.second?.toLowerCase() === me) return 'second';
    return null;
  });
  protected readonly opponent = computed(() => {
    const m = this.match();
    const seat = this.mySeat();
    return m && seat ? m.players[seat === 'first' ? 'second' : 'first'] : null;
  });
  protected readonly myTurn = computed(() => this.match()?.status === 'playing' && this.match()?.turn === this.mySeat());

  /** The mark (X/O or red/yellow) of a seat in the current game. */
  protected mark(seat: Seat): string {
    const m = this.match();
    return m ? MARKS[m.game][seat] : '';
  }

  protected readonly cells = computed(() => {
    const m = this.match();
    return m ? m.board.map((seat) => (seat ? MARKS[m.game][seat] : null)) : [];
  });
  protected readonly tttCells = computed(() => this.cells() as TicTacToeCell[]);
  protected readonly c4Cells = computed(() => this.cells() as ConnectFourCell[]);

  constructor() {
    this.start();
    const timer = setInterval(() => this.poll(), POLL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  private async start(): Promise<void> {
    try {
      this.update(await this.matches.join(this.code));
    } catch (err) {
      this.fatal.set((err as Error).message);
    }
  }

  private polling = false;

  private async poll(): Promise<void> {
    if (this.polling || this.fatal() || !this.match()) return;
    this.polling = true;
    try {
      this.update(await this.matches.get(this.code));
      this.error.set(null);
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.polling = false;
    }
  }

  /** Ignores responses older than what's already shown (a poll can overtake a move). */
  private update(next: Match): void {
    const current = this.match();
    if (!current || next.updatedAt >= current.updatedAt) this.match.set(next);
  }

  protected async play(move: number): Promise<void> {
    if (!this.myTurn() || this.busy()) return;
    await this.run(() => this.matches.move(this.code, move));
  }

  protected async rematch(): Promise<void> {
    const m = this.match();
    if (m) await this.run(() => this.matches.rematch(this.code, m.round));
  }

  private async run(action: () => Promise<Match>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      this.update(await action());
    } catch (err) {
      this.error.set((err as Error).message);
    } finally {
      this.busy.set(false);
    }
  }

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.link);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Clipboard not available: the link is shown on the page to copy by hand.
    }
  }
}
