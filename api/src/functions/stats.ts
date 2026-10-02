import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { Container, CosmosClient, ErrorResponse } from '@azure/cosmos';

const RESULTS: Record<string, string[]> = {
  'tic-tac-toe': ['X', 'O', 'draw'],
  'connect-four': ['red', 'yellow', 'draw'],
};

interface GameStats {
  id: string;
  played: number;
  results: Record<string, number>;
}

let container: Container | undefined;

function getContainer(): Container {
  if (!container) {
    const connectionString = process.env['COSMOS_CONNECTION_STRING'];
    if (!connectionString) throw new Error('COSMOS_CONNECTION_STRING is not set');
    container = new CosmosClient(connectionString).database('minigames').container('stats');
  }
  return container;
}

function emptyStats(game: string): GameStats {
  return {
    id: game,
    played: 0,
    results: Object.fromEntries(RESULTS[game].map((r) => [r, 0])),
  };
}

async function getStats(): Promise<HttpResponseInit> {
  const { resources } = await getContainer().items.readAll<GameStats>().fetchAll();
  const stats = Object.fromEntries(
    Object.keys(RESULTS).map((game) => {
      const doc = resources.find((r) => r.id === game) ?? emptyStats(game);
      return [game, { played: doc.played, results: doc.results }];
    }),
  );
  return { jsonBody: stats };
}

async function recordResult(request: HttpRequest): Promise<HttpResponseInit> {
  const body = (await request.json().catch(() => null)) as { game?: string; result?: string } | null;
  const game = body?.game ?? '';
  const result = body?.result ?? '';
  if (!RESULTS[game]?.includes(result)) {
    return { status: 400, jsonBody: { error: 'Invalid game or result' } };
  }

  const item = getContainer().item(game, game);
  const increment = () =>
    item.patch([
      { op: 'incr', path: '/played', value: 1 },
      { op: 'incr', path: `/results/${result}`, value: 1 },
    ]);

  try {
    await increment();
  } catch (err) {
    if ((err as ErrorResponse).code !== 404) throw err;
    // First game ever for this game type: create the document, then increment.
    try {
      await getContainer().items.create(emptyStats(game));
    } catch (createErr) {
      // Another request created it at the same time; that's fine.
      if ((createErr as ErrorResponse).code !== 409) throw createErr;
    }
    await increment();
  }
  return { status: 204 };
}

app.http('stats', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'stats',
  handler: (request) => (request.method === 'POST' ? recordResult(request) : getStats()),
});