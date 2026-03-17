import { describe, it, expect, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { PPEPlugin, CalculationModel, ValidationResult, Rule } from '@run-iq/core';
import { createApp } from '../../src/app.js';

// Minimal model for testing
const stubModel: CalculationModel = {
  name: 'STUB',
  version: '1.0.0',
  validateParams(_params: unknown): ValidationResult {
    return { valid: true };
  },
  calculate(
    input: Record<string, unknown>,
    _matchedRule: Readonly<Rule>,
    _params: unknown,
  ): number {
    return (input['amount'] as number) ?? 0;
  },
};

// Minimal plugin that registers the stub model
const stubPlugin: PPEPlugin = {
  name: 'stub-plugin',
  version: '1.0.0',
  onInit(context) {
    context.modelRegistry.register(stubModel);
  },
};

function buildValidBody() {
  return {
    rules: [
      {
        id: 'rule-1',
        version: 1,
        model: 'STUB',
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: 'abc123',
      },
    ],
    input: {
      requestId: `req-${Date.now()}`,
      data: { amount: 100 },
      meta: { tenantId: 'tenant-1' },
    },
  };
}

describe('POST /evaluate', () => {
  let app: FastifyInstance;

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with evaluation result', async () => {
    app = createApp({
      plugins: [stubPlugin],
      dsls: [],
      logLevel: 'silent',
      strict: false,
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: buildValidBody(),
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body).toHaveProperty('requestId');
    expect(body).toHaveProperty('value');
    expect(body).toHaveProperty('breakdown');
    expect(body).toHaveProperty('appliedRules');
    expect(body).toHaveProperty('skippedRules');
    expect(body).toHaveProperty('trace');
    expect(body).toHaveProperty('engineVersion');
    expect(typeof body.engineVersion).toBe('string');
  });

  it('returns 400 for missing rules', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        input: {
          requestId: 'req-1',
          data: {},
          meta: { tenantId: 't1' },
        },
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body).toHaveProperty('statusCode', 400);
  });

  it('returns 400 for missing input', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: [],
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for invalid rule structure', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: [{ bad: 'data' }],
        input: {
          requestId: 'req-1',
          data: {},
          meta: { tenantId: 't1' },
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for missing tenantId in meta', async () => {
    app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: [],
        input: {
          requestId: 'req-1',
          data: {},
          meta: {},
        },
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('hydrates date strings into Date objects', async () => {
    app = createApp({
      plugins: [stubPlugin],
      dsls: [],
      logLevel: 'silent',
      strict: false,
    });

    const body = buildValidBody();
    body.rules[0]!.effectiveFrom = '2023-06-15T00:00:00.000Z';
    body.rules[0]!.effectiveUntil = '2030-12-31T23:59:59.999Z';

    const response = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: body,
    });

    expect(response.statusCode).toBe(200);
  });
});
