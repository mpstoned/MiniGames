import { randomInt } from 'node:crypto';
import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getContainer, hasStatus } from '../cosmos';
import { Board, RULES, Seat, SEAT_RESULT } from '../rules';
import { recordGame } from '../record';

/**
 * Online matches between two signed-in players. Clients poll GET for updates;
 * every move is validated here. Match documents share the `stats` container
 * (see cosmos.ts) under a `match:` id prefix.
 */
interface Match {
  id: string;
  type: 'match';
  code: string;
  game: string;
  /** `first` always starts; seats swap on every rematch. */
  players: Record<Seat, string | null>;
  board: Board;
  turn: Seat;
  status: 'waiting' | 'playing' | 'finished';
  /** Set when finished: the winning seat, or null for a draw. */
  winner: Seat | null;
  winLine: number[] | null;
  round: number;
  createdAt: string;
  updatedAt: string;
  _etag?: string;
}

// No 0/O or 1/I/L, so codes are easy to read out to a friend.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;

const matchId = (code: string) => `match:${code.toUpperCase()}`;

function publicView(m: Match) {
  const { code, game, players, board, turn, status, winner, winLine, round, updatedAt } = m;
  return { code, game, players, board, turn, status, winner, winLine, round, updatedAt };
}

const error = (status: number, message: string): HttpResponseInit => ({ status, jsonBody: { error: message } });

async function readBody(request: HttpRequest): Promise<Record<string, unknown>> {
  return ((await request.json().catch(() => null)) as Record<string, unknown> | null) ?? {};
}

function readPlayer(body: Record<string, unknown>): string | null {
  const player = typeof body['player'] === 'string' ? body['player'].trim() : '';
  return player && player.length <= 20 ? player : null;
}

function seatOf(match: Match, player: string): Seat | null {
  const name = player.toLowerCase();
  if (match.players.first?.toLowerCase() === name) return 'first';
  if (match.players.second?.toLowerCase() === name) return 'second';
  return null;
}

async function loadMatch(code: string): Promise<Match | undefined> {
  const id = matchId(code);
  const { resource } = await (await getContainer('stats')).item(id, id).read<Match>();
  return resource;
}

/** Saves only if nobody changed the match since it was read; returns false otherwise. */
async function saveMatch(match: Match): Promise<boolean> {
  match.updatedAt = new Date().toISOString();
  try {
    await (await getContainer('stats'))
      .item(match.id, match.id)
      .replace(match, { accessCondition: { type: 'IfMatch', condition: match._etag! } });
    return true;
  } catch (err) {
    if (hasStatus(err, 412)) return false;
    throw err;
  }
}

const conflict = error(409, 'The match changed in the meantime. Please try again.');

async function create(request: HttpRequest): Promise<HttpResponseInit> {
  const body = await readBody(request);
  const player = readPlayer(body);
  const game = String(body['game'] ?? '');
  if (!player) return error(400, 'Missing player');
  if (!RULES[game]) return error(400, 'Unknown game');

  const container = await getContainer('stats');
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('');
    const match: Match = {
      id: matchId(code),
      type: 'match',
      code,
      game,
      players: { first: player, second: null },
      board: Array(RULES[game].size).fill(null),
      turn: 'first',
      status: 'waiting',
      winner: null,
      winLine: null,
      round: 1,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await container.items.create(match);
      return { status: 201, jsonBody: publicView(match) };
    } catch (err) {
      if (!hasStatus(err, 409)) throw err; // Code already in use: try another one.
    }
  }
  return error(503, 'Could not create a match. Please try again.');
}

async function get(request: HttpRequest): Promise<HttpResponseInit> {
  const match = await loadMatch(request.params['code']);
  return match ? { jsonBody: publicView(match) } : error(404, 'Match not found');
}

async function join(request: HttpRequest): Promise<HttpResponseInit> {
  const player = readPlayer(await readBody(request));
  if (!player) return error(400, 'Missing player');
  const match = await loadMatch(request.params['code']);
  if (!match) return error(404, 'Match not found');

  if (seatOf(match, player)) return { jsonBody: publicView(match) }; // Already in it (e.g. page reload).
  if (match.players.second) return error(409, 'This match already has two players.');

  match.players.second = player;
  match.status = 'playing';
  return (await saveMatch(match)) ? { jsonBody: publicView(match) } : conflict;
}

async function move(request: HttpRequest): Promise<HttpResponseInit> {
  const body = await readBody(request);
  const player = readPlayer(body);
  if (!player) return error(400, 'Missing player');
  const match = await loadMatch(request.params['code']);
  if (!match) return error(404, 'Match not found');

  const seat = seatOf(match, player);
  if (!seat) return error(403, "You're not playing in this match.");
  if (match.status !== 'playing') return error(409, 'The match is not running.');
  if (match.turn !== seat) return error(409, "It's not your turn.");

  const rules = RULES[match.game];
  const index = rules.place(match.board, Number(body['move']));
  if (index === null) return error(400, 'Invalid move');

  match.board[index] = seat;
  const winLine = rules.findWin(match.board, index);
  const finished = !!winLine || match.board.every(Boolean);
  if (finished) {
    match.status = 'finished';
    match.winner = winLine ? seat : null;
    match.winLine = winLine;
  } else {
    match.turn = seat === 'first' ? 'second' : 'first';
  }

  if (!(await saveMatch(match))) return conflict;
  if (finished) {
    const result = match.winner ? SEAT_RESULT[match.game][match.winner] : 'draw';
    await recordGame(match.game, result, [match.players.first!, match.players.second!]);
  }
  return { jsonBody: publicView(match) };
}

async function rematch(request: HttpRequest): Promise<HttpResponseInit> {
  const body = await readBody(request);
  const player = readPlayer(body);
  if (!player) return error(400, 'Missing player');
  const match = await loadMatch(request.params['code']);
  if (!match) return error(404, 'Match not found');
  if (!seatOf(match, player)) return error(403, "You're not playing in this match.");

  // Both players may click at once: only the first click for this round starts a new one.
  if (match.status !== 'finished' || Number(body['round']) !== match.round) return { jsonBody: publicView(match) };

  Object.assign(match, {
    players: { first: match.players.second, second: match.players.first }, // The other player starts.
    board: Array(RULES[match.game].size).fill(null),
    turn: 'first',
    status: 'playing',
    winner: null,
    winLine: null,
    round: match.round + 1,
  });
  if (await saveMatch(match)) return { jsonBody: publicView(match) };
  const current = await loadMatch(match.code);
  return { jsonBody: publicView(current!) };
}

const route = (path: string) => `matches${path}`;
app.http('matchCreate', { methods: ['POST'], authLevel: 'anonymous', route: route(''), handler: create });
app.http('matchGet', { methods: ['GET'], authLevel: 'anonymous', route: route('/{code}'), handler: get });
app.http('matchJoin', { methods: ['POST'], authLevel: 'anonymous', route: route('/{code}/join'), handler: join });
app.http('matchMove', { methods: ['POST'], authLevel: 'anonymous', route: route('/{code}/move'), handler: move });
app.http('matchRematch', { methods: ['POST'], authLevel: 'anonymous', route: route('/{code}/rematch'), handler: rematch });
