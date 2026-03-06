import type { FastifyInstance } from 'fastify';

const ENGINE_VERSION = '0.1.2';

export async function healthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    return { status: 'ok', engine: ENGINE_VERSION };
  });
}
