import { describe, it, expect, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PPEPlugin, CalculationModel, ValidationResult, Rule } from '@run-iq/core';
import { createApp } from '../../src/app.js';

const multiplyModel: CalculationModel = {
  name: 'MULTIPLY',
  version: '1.0.0',
  validateParams(params: unknown): ValidationResult {
    const p = params as Record<string, unknown>;
    if (typeof p['factor'] !== 'number') {
      return { valid: false, errors: ['factor must be a number'] };
    }
    return { valid: true };
  },
  calculate(input: Record<string, unknown>, _matchedRule: Readonly<Rule>, params: unknown): number {
    const p = params as { factor: number; base: string };
    return ((input[p.base] as number) ?? 0) * p.factor;
  },
};

const testPlugin: PPEPlugin = {
  name: 'test-plugin',
  version: '1.0.0',
  onInit(context) {
    context.modelRegistry.register(multiplyModel);
  },
};

describe('Server integration', () => {
  let app: FastifyInstance;

  afterAll(async () => {
    await app.close();
  });

  it('evaluates rules end-to-end with a plugin', async () => {
    app = createApp({
      plugins: [testPlugin],
      dsls: [],
      strict: false,
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: [
          {
            id: 'rule-multiply',
            version: 1,
            model: 'MULTIPLY',
            params: { factor: 0.2, base: 'salary' },
            priority: 1,
            effectiveFrom: '2020-01-01T00:00:00.000Z',
            effectiveUntil: null,
            tags: [],
            checksum: 'chk-1',
          },
        ],
        input: {
          requestId: `req-int-${Date.now()}`,
          data: { salary: 1000 },
          meta: { tenantId: 'tenant-1' },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.requestId).toContain('req-int-');
    expect(body.engineVersion).toBe('0.1.2');
    expect(body.pluginVersions).toHaveProperty('test-plugin', '1.0.0');
  });

  it('health check works alongside evaluation routes', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const healthRes = await app.inject({ method: 'GET', url: '/health' });
    expect(healthRes.statusCode).toBe(200);
    expect(healthRes.json()).toEqual({ status: 'ok', engine: '0.1.2' });

    const evalRes = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: [],
        input: {
          requestId: `req-both-${Date.now()}`,
          data: {},
          meta: { tenantId: 't1' },
        },
      },
    });
    expect(evalRes.statusCode).toBe(200);
  });

  it('returns 404 for unknown routes', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/unknown',
    });

    expect(response.statusCode).toBe(404);
  });

  it('handles createApp with minimal config', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
    });

    expect(app).toBeDefined();
  });
});
