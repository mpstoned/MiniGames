import { Component, computed, signal } from '@angular/core';

type Player = 'X' | 'O';
type Cell = Player | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly board = signal<Cell[]>(Array(9).fill(null));
  protected readonly current = signal<Player>('X');
  protected readonly score = signal({ X: 0, O: 0, draw: 0 });

  protected readonly winLine = computed(() => {
    const b = this.board();
    return LINES.find(([a, c, d]) => b[a] && b[a] === b[c] && b[a] === b[d]) ?? null;
  });
  protected readonly winner = computed(() => {
    const line = this.winLine();
    return line ? this.board()[line[0]] : null;
  });
  protected readonly isDraw = computed(() => !this.winner() && this.board().every((c) => c));

  protected play(i: number): void {
    if (this.board()[i] || this.winner()) return;
    this.board.update((b) => b.map((c, idx) => (idx === i ? this.current() : c)));
    const winner = this.winner();
    if (winner) {
      this.score.update((s) => ({ ...s, [winner]: s[winner] + 1 }));
    } else if (this.isDraw()) {
      this.score.update((s) => ({ ...s, draw: s.draw + 1 }));
    } else {
      this.current.update((p) => (p === 'X' ? 'O' : 'X'));
    }
  }

  protected reset(): void {
    this.board.set(Array(9).fill(null));
    this.current.set('X');
  }
}
