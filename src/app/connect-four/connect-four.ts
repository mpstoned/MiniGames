import { Component, computed, inject, signal } from '@angular/core';
import { StatsService } from '../stats.service';

type Player = 'red' | 'yellow';
type Cell = Player | null;

const ROWS = 6;
const COLS = 7;
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

@Component({
  selector: 'app-connect-four',
  styleUrl: './connect-four.css',
  templateUrl: './connect-four.html',
})
export class ConnectFour {
  private readonly stats = inject(StatsService);

  protected readonly columns = Array.from({ length: COLS }, (_, c) => c);
  protected readonly rows = Array.from({ length: ROWS }, (_, r) => r);

  protected readonly board = signal<Cell[]>(Array(ROWS * COLS).fill(null));
  protected readonly current = signal<Player>('red');
  protected readonly winLine = signal<number[] | null>(null);
  protected readonly score = signal({ red: 0, yellow: 0, draw: 0 });

  protected readonly winner = computed(() => {
    const line = this.winLine();
    return line ? this.board()[line[0]] : null;
  });
  protected readonly isDraw = computed(() => !this.winner() && this.board().every((c) => c));
  protected readonly gameOver = computed(() => !!this.winner() || this.isDraw());

  protected cell(row: number, col: number): Cell {
    return this.board()[row * COLS + col];
  }

  protected isWinCell(row: number, col: number): boolean {
    return this.winLine()?.includes(row * COLS + col) ?? false;
  }

  protected isColumnFull(col: number): boolean {
    return this.board()[col] !== null;
  }

  protected drop(col: number): void {
    if (this.gameOver()) return;
    const board = this.board();
    let row = ROWS - 1;
    while (row >= 0 && board[row * COLS + col]) row--;
    if (row < 0) return;

    const player = this.current();
    this.board.update((b) => b.map((c, i) => (i === row * COLS + col ? player : c)));

    const line = this.findWin(row, col, player);
    if (line) {
      this.winLine.set(line);
      this.score.update((s) => ({ ...s, [player]: s[player] + 1 }));
      this.stats.record('connect-four', player);
    } else if (this.isDraw()) {
      this.score.update((s) => ({ ...s, draw: s.draw + 1 }));
      this.stats.record('connect-four', 'draw');
    } else {
      this.current.set(player === 'red' ? 'yellow' : 'red');
    }
  }

  protected reset(): void {
    this.board.set(Array(ROWS * COLS).fill(null));
    this.current.set('red');
    this.winLine.set(null);
  }

  private findWin(row: number, col: number, player: Player): number[] | null {
    const b = this.board();
    for (const [dr, dc] of DIRECTIONS) {
      const line = [row * COLS + col];
      for (const sign of [1, -1]) {
        let r = row + dr * sign;
        let c = col + dc * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && b[r * COLS + c] === player) {
          line.push(r * COLS + c);
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (line.length >= 4) return line;
    }
    return null;
  }
}
