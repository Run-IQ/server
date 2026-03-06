import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PPEEngine, hydrateRules } from '@run-iq/core';
import type { PPEEngineConfig, EvaluationInput } from '@run-iq/core';
import type { ServerConfig } from '../config.js';
import { evaluateRequestSchema } from '../schemas/evaluate.js';

interface EvaluateBody {
  rules: Record<string, unknown>[];
  input: {
    requestId: string;
    data: Record<string, unknown>;
    meta: {
      tenantId: string;
      userId?: string;
      tags?: string[];
      context?: Record<string, unknown>;
      effectiveDate?: string;
    };
  };
}

export function createEvaluateRoute(config: ServerConfig): FastifyPluginAsync {
  return async function evaluateRoute(app: FastifyInstance): Promise<void> {
    const engineConfig: PPEEngineConfig = {
      plugins: config.plugins,
      dsls: config.dsls,
      snapshot: config.snapshot,
      strict: config.strict,
      timeout: config.timeout,
      dryRun: config.snapshot == null,
    };

    const engine = new PPEEngine(engineConfig);

    app.post<{ Body: EvaluateBody }>(
      '/evaluate',
      {
        schema: {
          body: evaluateRequestSchema,
        },
      },
      async (request) => {
        const { rules: rawRules, input: rawInput } = request.body;

        const rules = hydrateRules(rawRules);

        const input: EvaluationInput = {
          requestId: rawInput.requestId,
          data: rawInput.data,
          meta: {
            tenantId: rawInput.meta.tenantId,
            userId: rawInput.meta.userId,
            tags: rawInput.meta.tags,
            context: rawInput.meta.context,
            effectiveDate: rawInput.meta.effectiveDate
              ? new Date(rawInput.meta.effectiveDate)
              : undefined,
          },
        };

        const result = await engine.evaluate(rules, input);

        return result;
      },
    );
  };
}
