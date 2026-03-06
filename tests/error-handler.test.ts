import { describe, it, expect, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type {
  PPEPlugin,
  CalculationModel,
  ValidationResult,
  Rule,
  ISnapshotAdapter,
  Snapshot,
} from '@run-iq/core';
import { PPEError } from '@run-iq/core';
import { createApp } from '../src/app.js';

// SHA-256 of JSON.stringify({})
const EMPTY_PARAMS_CHECKSUM = '44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a';

function buildValidBody(model = 'PASS', overrides?: Record<string, unknown>) {
  return {
    rules: [
      {
        id: 'r-1',
        version: 1,
        model,
        params: {},
        priority: 1,
        effectiveFrom: '2020-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: [],
        checksum: EMPTY_PARAMS_CHECKSUM,
        ...overrides,
      },
    ],
    input: {
      requestId: `req-err-${Date.now()}-${Math.random()}`,
      data: { amount: 100 },
      meta: { tenantId: 't1' },
    },
  };
}

// Model that always throws a specific error
function throwingModel(name: string, errorFactory: () => Error): CalculationModel {
  return {
    name,
    version: '1.0.0',
    validateParams(): ValidationResult {
      return { valid: true };
    },
    calculate(): number {
      throw errorFactory();
    },
  };
}

// Model that works fine (for conflict and snapshot tests)
const passModel: CalculationModel = {
  name: 'PASS',
  version: '1.0.0',
  validateParams(): ValidationResult {
    return { valid: true };
  },
  calculate(input: Record<string, unknown>, _rule: Readonly<Rule>): number {
    return (input['amount'] as number) ?? 0;
  },
};

function pluginWith(...models: CalculationModel[]): PPEPlugin {
  return {
    name: 'error-test-plugin',
    version: '1.0.0',
    onInit(context) {
      for (const m of models) {
        context.modelRegistry.register(m);
      }
    },
  };
}

// Snapshot adapter that always throws on save
function failingSnapshotAdapter(): ISnapshotAdapter {
  return {
    async save(): Promise<string> {
      throw new Error('DB connection lost');
    },
    async get(): Promise<Snapshot> {
      throw new Error('not implemented');
    },
    async exists(): Promise<boolean> {
      return false;
    },
  };
}

describe('Error handler', () => {
  const apps: FastifyInstance[] = [];

  afterAll(async () => {
    await Promise.all(apps.map((a) => a.close()));
  });

  it('returns 422 for PPEError thrown by model.calculate()', async () => {
    const model = throwingModel('THROW_PPE', () => new PPEError('Engine error', 'ENGINE_FAILURE'));
    const app = createApp({
      plugins: [pluginWith(model)],
      dsls: [],
      logLevel: 'silent',
      strict: false,
    });
    apps.push(app);

    const res = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: buildValidBody('THROW_PPE'),
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.error).toBe('Processing Error');
    expect(body.code).toBe('ENGINE_FAILURE');
  });

  it('returns 500 for unexpected errors from model.calculate()', async () => {
    const model = throwingModel(
      'THROW_UNKNOWN',
      () => new TypeError('Cannot read properties of undefined'),
    );
    const app = createApp({
      plugins: [pluginWith(model)],
      dsls: [],
      logLevel: 'silent',
      strict: false,
    });
    apps.push(app);

    const res = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: buildValidBody('THROW_UNKNOWN'),
    });

    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toBe('An unexpected error occurred');
  });

  it('returns 409 for RuleConflictError (duplicate priorities, strict mode)', async () => {
    const app = createApp({
      plugins: [pluginWith(passModel)],
      dsls: [],
      logLevel: 'silent',
      strict: true,
    });
    apps.push(app);

    // Two rules with same priority → conflict in strict mode
    const payload = {
      rules: [
        {
          id: 'r-conflict-1',
          version: 1,
          model: 'PASS',
          params: {},
          priority: 5,
          effectiveFrom: '2020-01-01T00:00:00.000Z',
          effectiveUntil: null,
          tags: [],
          checksum: EMPTY_PARAMS_CHECKSUM,
        },
        {
          id: 'r-conflict-2',
          version: 1,
          model: 'PASS',
          params: {},
          priority: 5,
          effectiveFrom: '2020-01-01T00:00:00.000Z',
          effectiveUntil: null,
          tags: [],
          checksum: EMPTY_PARAMS_CHECKSUM,
        },
      ],
      input: {
        requestId: `req-conflict-${Date.now()}`,
        data: { amount: 100 },
        meta: { tenantId: 't1' },
      },
    };

    const res = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload,
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.error).toBe('Rule Conflict');
    expect(body.code).toBe('RULE_CONFLICT');
    expect(body.ruleIds).toContain('r-conflict-1');
    expect(body.ruleIds).toContain('r-conflict-2');
  });

  it('returns 503 for SnapshotFailureError (strict + failing adapter)', async () => {
    const app = createApp({
      plugins: [pluginWith(passModel)],
      dsls: [],
      logLevel: 'silent',
      strict: true,
      snapshot: failingSnapshotAdapter(),
    });
    apps.push(app);

    const res = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: buildValidBody('PASS'),
    });

    expect(res.statusCode).toBe(503);
    const body = res.json();
    expect(body.error).toBe('Snapshot Failure');
    expect(body.code).toBe('SNAPSHOT_FAILURE');
  });

  it('returns 400 for Fastify schema validation errors', async () => {
    const app = createApp({
      plugins: [],
      dsls: [],
      logLevel: 'silent',
    });
    apps.push(app);

    const res = await app.inject({
      method: 'POST',
      url: '/evaluate',
      payload: {
        rules: 'not-an-array',
        input: { requestId: 'x', data: {}, meta: { tenantId: 't' } },
      },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe('Validation Error');
    expect(body.statusCode).toBe(400);
  });
});
