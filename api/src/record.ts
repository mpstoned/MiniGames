import { PatchRequestBody } from '@azure/cosmos';
import { getContainer, hasStatus, patchOrCreate } from './cosmos';
import { emptyDay, emptyStats, userId } from './games';

/** Counts a finished game globally, for its day, and for each of its players. */
export async function recordGame(game: string, result: string, players: string[]): Promise<void> {
  const container = await getContainer('stats');
  const now = new Date().toISOString();
  const date = now.slice(0, 10);

  await Promise.all([
    patchOrCreate(container, emptyStats(game), [
      { op: 'incr', path: '/played', value: 1 },
      { op: 'incr', path: `/results/${result}`, value: 1 },
    ]),
    patchOrCreate(container, emptyDay(date), [{ op: 'incr', path: `/games/${game}`, value: 1 }]),
    ...players.map((player) => recordForPlayer(player, game, now)),
  ]);
}

async function recordForPlayer(player: string, game: string, now: string): Promise<void> {
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
