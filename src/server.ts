import type { ServerConfig } from './config.js';
import { createApp } from './app.js';
import { resolveConfig } from './config.js';

export async function start(
  partial: Partial<ServerConfig> & Pick<ServerConfig, 'plugins' | 'dsls'>,
): Promise<void> {
  const config = resolveConfig(partial);
  const app = createApp(partial);

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}, shutting down gracefully…`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ port: config.port, host: config.host });
}
