import Fastify from 'fastify';
import type { FastifyInstance, FastifyError } from 'fastify';
import { PPEError, ValidationError, RuleConflictError, SnapshotFailureError } from '@run-iq/core';
import { type ServerConfig, resolveConfig } from './config.js';
import { healthRoute } from './routes/health.js';
import { createEvaluateRoute } from './routes/evaluate.js';

export function createApp(
  partial: Partial<ServerConfig> & Pick<ServerConfig, 'plugins' | 'dsls'>,
): FastifyInstance {
  const config = resolveConfig(partial);

  const app = Fastify({
    logger: config.logLevel !== 'silent' ? { level: config.logLevel ?? 'info' } : false,
  });

  // Register routes
  app.register(healthRoute);
  app.register(createEvaluateRoute(config));

  // Global error handler
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if ('validation' in error && (error as FastifyError).validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        statusCode: 400,
      });
    }

    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: error.message,
        code: error.code,
        reasons: error.reasons,
        statusCode: 400,
      });
    }

    if (error instanceof RuleConflictError) {
      return reply.status(409).send({
        error: 'Rule Conflict',
        message: error.message,
        code: error.code,
        ruleIds: error.ruleIds,
        statusCode: 409,
      });
    }

    if (error instanceof SnapshotFailureError) {
      return reply.status(503).send({
        error: 'Snapshot Failure',
        message: error.message,
        code: error.code,
        statusCode: 503,
      });
    }

    if (error instanceof PPEError) {
      return reply.status(422).send({
        error: 'Processing Error',
        message: error.message,
        code: error.code,
        statusCode: 422,
      });
    }

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  return app;
}
