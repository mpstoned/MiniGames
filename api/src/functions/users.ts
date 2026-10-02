import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getContainer, hasStatus } from '../cosmos';
import { User, userId } from '../games';

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

async function readUsername(request: HttpRequest): Promise<string | null> {
  const body = (await request.json().catch(() => null)) as { username?: unknown } | null;
  const username = typeof body?.username === 'string' ? body.username.trim() : '';
  return USERNAME_PATTERN.test(username) ? username : null;
}

const invalidUsername: HttpResponseInit = {
  status: 400,
  jsonBody: { error: 'Username must be 3–20 characters: letters, digits, _ or -' },
};

async function signUp(request: HttpRequest): Promise<HttpResponseInit> {
  const username = await readUsername(request);
  if (!username) return invalidUsername;

  // Users share the `stats` container (see cosmos.ts). The lowercased name is
  // part of the id, so Cosmos itself rejects duplicates.
  const now = new Date().toISOString();
  const user: User = { id: userId(username), type: 'user', username, createdAt: now, lastSeenAt: now, signIns: 1, games: {} };
  try {
    const container = await getContainer('stats');
    await container.items.create(user);
  } catch (err) {
    if (hasStatus(err, 409)) return { status: 409, jsonBody: { error: 'Username already taken' } };
    throw err;
  }
  return { status: 201, jsonBody: { username } };
}

async function signIn(request: HttpRequest): Promise<HttpResponseInit> {
  const username = await readUsername(request);
  if (!username) return invalidUsername;

  const id = userId(username);
  const container = await getContainer('stats');
  try {
    const { resource } = await container.item(id, id).patch<User>([
      { op: 'incr', path: '/signIns', value: 1 },
      { op: 'set', path: '/lastSeenAt', value: new Date().toISOString() },
    ]);
    return { jsonBody: { username: resource!.username } };
  } catch (err) {
    if (hasStatus(err, 404)) return { status: 404, jsonBody: { error: 'User not found' } };
    throw err;
  }
}

app.http('signup', { methods: ['POST'], authLevel: 'anonymous', route: 'users/signup', handler: signUp });
app.http('signin', { methods: ['POST'], authLevel: 'anonymous', route: 'users/signin', handler: signIn });
