export const evaluateRequestSchema = {
  type: 'object',
  required: ['rules', 'input'],
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'version',
          'model',
          'params',
          'priority',
          'effectiveFrom',
          'tags',
          'checksum',
        ],
        properties: {
          id: { type: 'string' },
          version: { type: 'number' },
          model: { type: 'string' },
          params: {},
          condition: {
            type: 'object',
            properties: {
              dsl: { type: 'string' },
              value: {},
            },
          },
          priority: { type: 'number' },
          effectiveFrom: { type: 'string' },
          effectiveUntil: { type: ['string', 'null'] },
          tags: { type: 'array', items: { type: 'string' } },
          checksum: { type: 'string' },
          schemaVersion: { type: 'string' },
        },
      },
    },
    input: {
      type: 'object',
      required: ['requestId', 'data', 'meta'],
      properties: {
        requestId: { type: 'string' },
        data: { type: 'object' },
        meta: {
          type: 'object',
          required: ['tenantId'],
          properties: {
            tenantId: { type: 'string' },
            userId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            context: { type: 'object' },
            effectiveDate: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

export const evaluateResponseSchema = {
  type: 'object',
  properties: {
    requestId: { type: 'string' },
    value: {},
    breakdown: { type: 'array' },
    appliedRules: { type: 'array' },
    skippedRules: { type: 'array' },
    trace: { type: 'object' },
    snapshotId: { type: 'string' },
    engineVersion: { type: 'string' },
    pluginVersions: { type: 'object' },
    dslVersions: { type: 'object' },
    timestamp: { type: 'string' },
    meta: { type: 'object' },
  },
} as const;
