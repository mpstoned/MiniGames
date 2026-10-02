import { Container, CosmosClient, Database, ErrorResponse } from '@azure/cosmos';

/**
 * The database schema. Like a migration script: anything missing is created
 * automatically on first use, so no manual setup is needed in Azure.
 * Only add entries here; existing containers are never changed or deleted.
 *
 * Keep the number of containers small: each one reserves its own throughput,
 * and the Cosmos DB free tier only covers 1000 RU/s for the whole account
 * (`stats` already uses all of it). New kinds of data share the `stats`
 * container instead, distinguished by an id prefix (e.g. `user:anna`).
 */
const DATABASE_ID = 'minigames';
const CONTAINERS = {
  stats: { partitionKey: '/id' },
};

export type ContainerName = keyof typeof CONTAINERS;

let database: Promise<Database> | undefined;
const containers = new Map<ContainerName, Promise<Container>>();

/** Caches a setup step; if it fails (e.g. a network hiccup), the next request retries it. */
function once<T>(create: () => Promise<T>, forget: () => void): Promise<T> {
  const promise = create();
  promise.catch((err) => {
    console.error('Cosmos DB setup failed:', err);
    forget();
  });
  return promise;
}

function getDatabase(): Promise<Database> {
  database ??= once(
    async () => {
      const connectionString = process.env['COSMOS_CONNECTION_STRING'];
      if (!connectionString) throw new Error('COSMOS_CONNECTION_STRING is not set');
      const client = new CosmosClient(connectionString);
      return (await client.databases.createIfNotExists({ id: DATABASE_ID })).database;
    },
    () => (database = undefined),
  );
  return database;
}

/** Each container is set up independently, so a problem with one never breaks the others. */
export function getContainer(name: ContainerName): Promise<Container> {
  let container = containers.get(name);
  if (!container) {
    container = once(
      async () => {
        const db = await getDatabase();
        const partitionKey = { paths: [CONTAINERS[name].partitionKey] };
        return (await db.containers.createIfNotExists({ id: name, partitionKey })).container;
      },
      () => containers.delete(name),
    );
    containers.set(name, container);
  }
  return container;
}

export function hasStatus(err: unknown, code: number): boolean {
  return (err as ErrorResponse)?.code === code;
}
