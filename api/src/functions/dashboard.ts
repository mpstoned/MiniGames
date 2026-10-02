import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getContainer } from '../cosmos';
import { DayStats, emptyDay, emptyStats, GAMES, GameStats, User, userId } from '../games';

export const ADMIN_USERNAME = 'admin';
const DAYS = 30;

async function overview(request: HttpRequest): Promise<HttpResponseInit> {
  // There are no passwords, so this only keeps the admin data out of the normal
  // game UI; it is not real access control.
  if (userId(request.headers.get('x-username') ?? '') !== userId(ADMIN_USERNAME)) {
    return { status: 403, jsonBody: { error: 'Admins only' } };
  }

  const container = await getContainer('stats');
  const today = new Date();
  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (DAYS - 1 - i));
    return d.toISOString().slice(0, 10);
  });

  const [users, days, games] = await Promise.all([
    container.items
      .query<User>("SELECT * FROM c WHERE c.type = 'user'")
      .fetchAll()
      .then((r) => r.resources),
    container.items
      .query<DayStats>({
        query: "SELECT * FROM c WHERE c.type = 'day' AND c.date >= @from",
        parameters: [{ name: '@from', value: dates[0] }],
      })
      .fetchAll()
      .then((r) => r.resources),
    Promise.all(
      GAMES.map(async (game) => {
        const { resource } = await container.item(game, game).read<GameStats>();
        const doc = resource ?? emptyStats(game);
        return [game, { played: doc.played, results: doc.results }] as const;
      }),
    ),
  ]);

  return {
    jsonBody: {
      games: Object.fromEntries(games),
      daily: dates.map((date) => {
        const day = days.find((d) => d.date === date) ?? emptyDay(date);
        return { date, games: day.games };
      }),
      users: users.map((u) => ({
        username: u.username,
        createdAt: u.createdAt,
        lastSeenAt: u.lastSeenAt ?? u.createdAt,
        signIns: u.signIns ?? 0,
        games: Object.fromEntries(GAMES.map((g) => [g, u.games?.[g] ?? 0])),
      })),
    },
  };
}

// Not under /api/admin: Azure Functions reserves routes starting with "admin".
app.http('dashboard', { methods: ['GET'], authLevel: 'anonymous', route: 'dashboard', handler: overview });
