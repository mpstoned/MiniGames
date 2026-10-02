import { Component, input, output } from '@angular/core';

export type ConnectFourCell = 'red' | 'yellow' | null;

const ROWS = 6;
const COLS = 7;

/** The 7×6 board, shared by local and online games. The output is the chosen column. */
@Component({
  selector: 'app-connect-four-board',
  styleUrl: './connect-four-board.css',
  template: `
    <div class="board" [class.over]="over()">
      @for (col of columns; track col) {
        <button
          class="column"
          [disabled]="disabled() || cells()[col] !== null"
          (click)="drop.emit(col)"
          [attr.aria-label]="'Drop disc in column ' + (col + 1)"
        >
          @for (row of rows; track row) {
            <span
              class="slot"
              [class]="cells()[row * cols + col]"
              [class.win]="winLine()?.includes(row * cols + col)"
            ></span>
          }
        </button>
      }
    </div>
  `,
})
export class ConnectFourBoard {
  protected readonly cols = COLS;
  protected readonly columns = Array.from({ length: COLS }, (_, c) => c);
  protected readonly rows = Array.from({ length: ROWS }, (_, r) => r);

  /** Row by row, top to bottom: index = row * 7 + column. */
  readonly cells = input.required<ConnectFourCell[]>();
  readonly winLine = input<number[] | null>(null);
  /** Dims the non-winning discs when the game is over. */
  readonly over = input(false);
  /** Blocks all moves, e.g. when the game is over or it's the other player's turn. */
  readonly disabled = input(false);
  readonly drop = output<number>();
}
