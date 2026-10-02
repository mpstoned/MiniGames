import { Container, CosmosClient, ErrorResponse } from '@azure/cosmos';

let client: CosmosClient | undefined;

export function getContainer(name: 'stats' | 'users'): Container {
  if (!client) {
    const connectionString = process.env['COSMOS_CONNECTION_STRING'];
    if (!connectionString) throw new Error('COSMOS_CONNECTION_STRING is not set');
    client = new CosmosClient(connectionString);
  }
  return client.database('minigames').container(name);
}

export function hasStatus(err: unknown, code: number): boolean {
  return (err as ErrorResponse)?.code === code;
}
