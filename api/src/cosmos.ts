import { Container, CosmosClient, Database, ErrorResponse } from '@azure/cosmos';

/**
 * The database schema. Like a migration script: anything missing is created
 * automatically on first use, so no manual setup is needed in Azure.
 * Only add entries here; existing containers are never changed or deleted.
 */
const DATABASE_ID = 'minigames';
const CONTAINERS = {
  stats: { partitionKey: '/id' },
  users: { partitionKey: '/id' },
};

export type ContainerName = keyof typeof CONTAINERS;

let setup: Promise<Database> | undefined;

function ensureSchema(): Promise<Database> {
  if (!setup) {
    setup = (async () => {
      const connectionString = process.env['COSMOS_CONNECTION_STRING'];
      if (!connectionString) throw new Error('COSMOS_CONNECTION_STRING is not set');
      const { database } = await new CosmosClient(connectionString).databases.createIfNotExists({ id: DATABASE_ID });
      for (const [id, { partitionKey }] of Object.entries(CONTAINERS)) {
        await database.containers.createIfNotExists({ id, partitionKey: { paths: [partitionKey] } });
      }
      return database;
    })();
    // If setup fails (e.g. a network hiccup), retry on the next request instead of failing forever.
    setup.catch(() => (setup = undefined));
  }
  return setup;
}

export async function getContainer(name: ContainerName): Promise<Container> {
  return (await ensureSchema()).container(name);
}

export function hasStatus(err: unknown, code: number): boolean {
  return (err as ErrorResponse)?.code === code;
}
