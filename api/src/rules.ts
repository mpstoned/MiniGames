/**
 * Server-side game rules for online matches, so moves are validated where
 * neither player can tamper with them.
 */

export type Seat = 'first' | 'second';
export type Board = (Seat | null)[];

interface Rules {
  size: number;
  /** Returns the board index the move lands on, or null if the move is invalid. */
  place(board: Board, move: number): number | null;
  /** Returns the winning line through `index`, or null. */
  findWin(board: Board, index: number): number[] | null;
}

const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

const ticTacToe: Rules = {
  size: 9,
  place: (board, cell) => (Number.isInteger(cell) && cell >= 0 && cell < 9 && !board[cell] ? cell : null),
  findWin: (board, index) =>
    TTT_LINES.find((line) => line.includes(index) && line.every((i) => board[i] === board[index])) ?? null,
};

const ROWS = 6;
const COLS = 7;

const connectFour: Rules = {
  size: ROWS * COLS,
  // The move is a column; the disc drops to the lowest free row.
  place: (board, col) => {
    if (!Number.isInteger(col) || col < 0 || col >= COLS) return null;
    for (let row = ROWS - 1; row >= 0; row--) {
      if (!board[row * COLS + col]) return row * COLS + col;
    }
    return null;
  },
  findWin: (board, index) => {
    const player = board[index];
    const row = Math.floor(index / COLS);
    const col = index % COLS;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const line = [index];
      for (const sign of [1, -1]) {
        let r = row + dr * sign;
        let c = col + dc * sign;
        while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === player) {
          line.push(r * COLS + c);
          r += dr * sign;
          c += dc * sign;
        }
      }
      if (line.length >= 4) return line;
    }
    return null;
  },
};

export const RULES: Record<string, Rules> = {
  'tic-tac-toe': ticTacToe,
  'connect-four': connectFour,
};

/** The result names used in the stats: the first seat plays X / red. */
export const SEAT_RESULT: Record<string, Record<Seat, string>> = {
  'tic-tac-toe': { first: 'X', second: 'O' },
  'connect-four': { first: 'red', second: 'yellow' },
};
