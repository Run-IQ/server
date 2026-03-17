import { describe, it, expect, afterAll } from 'vitest';
import { createApp } from '../../src/app.js';
import { SERVER_VERSION } from '../../src/version.js';

describe('GET /health', () => {
  const app = createApp({ plugins: [], dsls: [], logLevel: 'silent' });

  afterAll(async () => {
    await app.close();
  });

  it('returns status ok with server version', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toEqual({
      status: 'ok',
      version: SERVER_VERSION,
    });
  });

  it('returns application/json content type', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.headers['content-type']).toContain('application/json');
  });
});
