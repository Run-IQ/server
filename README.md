# @run-iq/server

An HTTP server for the [Run-IQ](https://github.com/Run-IQ/core) rule engine. It exposes `POST /evaluate` so that services written in any language can evaluate rules. Built on Fastify.

## Install

The package is published to GitHub Packages. Point the `@run-iq` scope at it in your `.npmrc` (GitHub requires a token with `read:packages`):

```
@run-iq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

```bash
npm install @run-iq/server @run-iq/core
```

`@run-iq/core` is a peer dependency. Requires Node.js 20 or later.

## Start

```ts
import { start } from '@run-iq/server';
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';
import { demoPlugin } from './demo-plugin.js';

await start({
  port: 3000,
  plugins: [demoPlugin],
  dsls: [new JsonLogicEvaluator()],
});
```

Plugins provide the calculation models your rules refer to; a rule whose model is not registered returns `422 MODEL_NOT_FOUND`. `demoPlugin` here is the plugin from the [core README example](https://github.com/Run-IQ/core#example), which registers a `PERCENTAGE` model. For a real domain, pass for example `new FiscalPlugin()` from `@run-iq/plugin-fiscal`.

| Option | Default | |
|---|---|---|
| `plugins` | required | Plugins to load |
| `dsls` | required | DSL evaluators for rule conditions |
| `port` | `3000` | |
| `host` | `'0.0.0.0'` | |
| `strict` | `true` | Requires `meta.effectiveDate` on every request |
| `snapshot` | none | Snapshot adapter. Without one, evaluations run in dry-run mode |
| `timeout` | engine defaults | `{ dsl, hook, pipeline }` in ms |
| `logLevel` | `'info'` | `'info'`, `'warn'`, `'error'` or `'silent'` |

`createApp(options)` returns the Fastify instance without listening, for tests (`app.inject()`) or to add your own routes.

## Endpoints

### `GET /health`

```json
{ "status": "ok", "version": "0.1.4" }
```

`version` is the server package version.

### `POST /evaluate`

The body holds the rules and the input. Rules use the same JSON shape as in `@run-iq/core`, dates as ISO strings, and each one needs a valid `checksum` (from `computeRuleChecksum`). A rule with a wrong checksum is not rejected, it shows up in `skippedRules` with `CHECKSUM_MISMATCH`.

```bash
curl -X POST localhost:3000/evaluate -H 'content-type: application/json' -d '{
  "rules": [{
    "id": "shipping-fee",
    "version": 1,
    "model": "PERCENTAGE",
    "params": { "base": "orderTotal", "rate": 0.05 },
    "priority": 1,
    "effectiveFrom": "2025-01-01T00:00:00.000Z",
    "effectiveUntil": null,
    "tags": [],
    "checksum": "a83ed3469a0a3856ffdce60de7d9327cd5e0b849a90c0e0ea317c2c826e4ea6a"
  }],
  "input": {
    "requestId": "order-42",
    "data": { "orderTotal": 200 },
    "meta": { "tenantId": "acme", "effectiveDate": "2025-06-01" }
  }
}'
```

The response is the engine's `EvaluationResult`:

```json
{
  "requestId": "order-42",
  "value": 10,
  "breakdown": [{ "ruleId": "shipping-fee", "contribution": 10, "modelUsed": "PERCENTAGE" }],
  "appliedRules": [...],
  "skippedRules": [],
  "trace": { "steps": [...], "totalDurationMs": 1.7 },
  "engineVersion": "0.2.7",
  "pluginVersions": { "demo": "1.0.0" },
  "dslVersions": {},
  "timestamp": "2026-10-30T05:54:01.338Z"
}
```

Errors return `{ error, message, code, statusCode }`: `400` for an invalid body or input (including a missing `effectiveDate` in strict mode), `409` for a rule conflict, `422` for other engine errors, `503` when the snapshot adapter fails.

## Docker

`dist/standalone.js` starts the server from environment variables:

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `HOST` | `0.0.0.0` | |
| `LOG_LEVEL` | `info` | |
| `STRICT` | `true` | Any value other than `false` keeps strict mode on |
| `PLUGINS` | none | Comma-separated plugin names. Only `fiscal` is known |
| `DSLS` | none | Comma-separated DSL names. Only `jsonlogic` is known |

```bash
npm run build
docker compose up
```

The Dockerfile has two targets: `core` (no plugins) and `full` (fiscal + jsonlogic, used by `docker-compose.yml`).

## License

Business Source License 1.1. Production use is allowed, except offering the package as a hosted or embedded service that competes with the licensor. It converts to Apache 2.0 on 2030-01-01. See [LICENSE](LICENSE).
