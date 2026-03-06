# @run-iq/server

HTTP REST server for the **Parametric Policy Engine (PPE)**. Wraps `@run-iq/core` behind a Fastify API for polyglot and non-Node integrations.

## Installation

```bash
npm install @run-iq/server
```

## Quick start

```typescript
import { start } from '@run-iq/server';
import { FiscalPlugin } from '@run-iq/plugin-fiscal';
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';

await start({
  port: 3000,
  plugins: [new FiscalPlugin()],
  dsls: [new JsonLogicEvaluator()],
  strict: false,
});
```

## API

### `GET /health`

```json
{ "status": "ok", "engine": "0.1.2" }
```

### `POST /evaluate`

**Request body:**

```json
{
  "rules": [
    {
      "id": "rule-1",
      "version": 1,
      "model": "FLAT_RATE",
      "params": { "rate": 0.18, "base": "grossSalary" },
      "priority": 1,
      "effectiveFrom": "2024-01-01T00:00:00.000Z",
      "effectiveUntil": null,
      "tags": ["togo", "irpp"],
      "checksum": "abc123"
    }
  ],
  "input": {
    "requestId": "req-001",
    "data": { "grossSalary": 2500000 },
    "meta": { "tenantId": "tenant-1" }
  }
}
```

**Response 200:** `EvaluationResult` (JSON serialized)

**Error responses:**

| Status | Condition |
|--------|-----------|
| 400 | Malformed input or `ValidationError` |
| 409 | `RuleConflictError` |
| 422 | Other `PPEError` |
| 503 | `SnapshotFailureError` |
| 500 | Unexpected error |

## Programmatic usage

```typescript
import { createApp } from '@run-iq/server';

const app = createApp({
  plugins: [myPlugin],
  dsls: [myDsl],
  strict: false,
  logLevel: 'silent',
});

// Use app.inject() for testing
const response = await app.inject({
  method: 'POST',
  url: '/evaluate',
  payload: { rules: [...], input: {...} },
});
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `3000` | Listen port |
| `host` | `string` | `'0.0.0.0'` | Listen host |
| `plugins` | `PPEPlugin[]` | required | PPE plugins to register |
| `dsls` | `DSLEvaluator[]` | required | DSL evaluators to register |
| `snapshot` | `ISnapshotAdapter` | — | Snapshot adapter |
| `strict` | `boolean` | `true` | Strict mode |
| `timeout` | `object` | — | Timeout config (`dsl`, `hook`, `pipeline`) |
| `logLevel` | `string` | `'info'` | `'info'` \| `'warn'` \| `'error'` \| `'silent'` |

## License

MIT — Abdou-Raouf ATARMLA
