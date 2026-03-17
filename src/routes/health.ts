import type { FastifyInstance } from 'fastify';
import { SERVER_VERSION } from '../version.js';

export async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return { status: 'ok', version: SERVER_VERSION };
  });
}
