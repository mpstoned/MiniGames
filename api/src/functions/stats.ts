import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getContainer } from '../cosmos';
import { emptyStats, GAMES, GameStats, RESULTS } from '../games';
import { recordGame } from '../record';

async function getStats(): Promise<HttpResponseInit> {
  const container = await getContainer('stats');
  // Read only the game documents by id; the container also holds user and day documents.
  const stats = await Promise.all(
    GAMES.map(async (game) => {
      const { resource } = await container.item(game, game).read<GameStats>();
      const doc = resource ?? emptyStats(game);
      return [game, { played: doc.played, results: doc.results }] as const;
    }),
  );
  return { jsonBody: Object.fromEntries(stats) };
}

async function recordResult(request: HttpRequest): Promise<HttpResponseInit> {
  const body = (await request.json().catch(() => null)) as { game?: string; result?: string; player?: unknown } | null;
  const game = body?.game ?? '';
  const result = body?.result ?? '';
  if (!RESULTS[game]?.includes(result)) {
    return { status: 400, jsonBody: { error: 'Invalid game or result' } };
  }
  const player = typeof body?.player === 'string' ? body.player : '';
  await recordGame(game, result, player ? [player] : []);
  return { status: 204 };
}

app.http('stats', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'stats',
  handler: (request) => (request.method === 'POST' ? recordResult(request) : getStats()),
});
