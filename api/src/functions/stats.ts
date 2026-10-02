import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { PatchRequestBody } from '@azure/cosmos';
import { getContainer, hasStatus, patchOrCreate } from '../cosmos';
import { emptyDay, emptyStats, GAMES, GameStats, RESULTS, userId } from '../games';

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

  const container = await getContainer('stats');
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  await Promise.all([
    patchOrCreate(container, emptyStats(game), [
      { op: 'incr', path: '/played', value: 1 },
      { op: 'incr', path: `/results/${result}`, value: 1 },
    ]),
    patchOrCreate(container, emptyDay(date), [{ op: 'incr', path: `/games/${game}`, value: 1 }]),
    recordForPlayer(body?.player, game, now),
  ]);
  return { status: 204 };
}

async function recordForPlayer(player: unknown, game: string, now: string): Promise<void> {
  if (typeof player !== 'string' || !player) return;
  const id = userId(player);
  const item = (await getContainer('stats')).item(id, id);
  const operations: PatchRequestBody = [
    { op: 'incr', path: `/games/${game}`, value: 1 },
    { op: 'set', path: '/lastSeenAt', value: now },
  ];
  try {
    await item.patch(operations);
  } catch (err) {
    // Unknown user (e.g. deleted while still signed in): the game still counts globally.
    if (hasStatus(err, 404)) return;
    if (!hasStatus(err, 400)) throw err;
    // Users created before per-user stats existed have no /games object yet.
    await item
      .patch({ condition: 'FROM c WHERE NOT IS_DEFINED(c.games)', operations: [{ op: 'add', path: '/games', value: {} }] })
      .catch((e) => {
        if (!hasStatus(e, 412)) throw e;
      });
    await item.patch(operations);
  }
}

app.http('stats', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'stats',
  handler: (request) => (request.method === 'POST' ? recordResult(request) : getStats()),
});
