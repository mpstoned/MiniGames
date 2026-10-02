import { app, HttpRequest, HttpResponseInit } from '@azure/functions';
import { getContainer, hasStatus } from '../cosmos';

const USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

interface User {
  id: string;
  username: string;
  createdAt: string;
}

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

  // The lowercased name is the document id, so Cosmos itself rejects duplicates.
  const user: User = { id: username.toLowerCase(), username, createdAt: new Date().toISOString() };
  try {
    const users = await getContainer('users');
    await users.items.create(user);
  } catch (err) {
    if (hasStatus(err, 409)) return { status: 409, jsonBody: { error: 'Username already taken' } };
    throw err;
  }
  return { status: 201, jsonBody: { username } };
}

async function signIn(request: HttpRequest): Promise<HttpResponseInit> {
  const username = await readUsername(request);
  if (!username) return invalidUsername;

  const id = username.toLowerCase();
  const users = await getContainer('users');
  const { resource } = await users.item(id, id).read<User>();
  if (!resource) return { status: 404, jsonBody: { error: 'User not found' } };
  return { jsonBody: { username: resource.username } };
}

app.http('signup', { methods: ['POST'], authLevel: 'anonymous', route: 'users/signup', handler: signUp });
app.http('signin', { methods: ['POST'], authLevel: 'anonymous', route: 'users/signin', handler: signIn });
