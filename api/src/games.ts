/** The games and their possible results. */
export const RESULTS: Record<string, string[]> = {
  'tic-tac-toe': ['X', 'O', 'draw'],
  'connect-four': ['red', 'yellow', 'draw'],
};

export const GAMES = Object.keys(RESULTS);

export interface GameStats {
  id: string;
  played: number;
  results: Record<string, number>;
}

export function emptyStats(game: string): GameStats {
  return {
    id: game,
    played: 0,
    results: Object.fromEntries(RESULTS[game].map((r) => [r, 0])),
  };
}

/** One document per day (`day:YYYY-MM-DD`) counting games played per game. */
export interface DayStats {
  id: string;
  type: 'day';
  date: string;
  games: Record<string, number>;
}

export function emptyDay(date: string): DayStats {
  return { id: `day:${date}`, type: 'day', date, games: Object.fromEntries(GAMES.map((g) => [g, 0])) };
}

/** One document per user (`user:<lowercased name>`). */
export interface User {
  id: string;
  type: 'user';
  username: string;
  createdAt: string;
  lastSeenAt?: string;
  signIns?: number;
  games?: Record<string, number>;
}

export function userId(username: string): string {
  return `user:${username.toLowerCase()}`;
}
