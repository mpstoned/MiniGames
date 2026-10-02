import { Component, input, output } from '@angular/core';

export type TicTacToeCell = 'X' | 'O' | null;

/** The 3×3 grid, shared by local and online games. */
@Component({
  selector: 'app-tic-tac-toe-board',
  styleUrl: './tic-tac-toe-board.css',
  template: `
    <div class="board">
      @for (cell of cells(); track $index) {
        <button
          class="cell"
          [class]="cell"
          [class.win]="winLine()?.includes($index)"
          [disabled]="!!cell || disabled()"
          (click)="play.emit($index)"
          [attr.aria-label]="'Cell ' + ($index + 1) + (cell ? ': ' + cell : '')"
        >
          {{ cell }}
        </button>
      }
    </div>
  `,
})
export class TicTacToeBoard {
  readonly cells = input.required<TicTacToeCell[]>();
  readonly winLine = input<number[] | null>(null);
  /** Blocks all moves, e.g. when the game is over or it's the other player's turn. */
  readonly disabled = input(false);
  readonly play = output<number>();
}
