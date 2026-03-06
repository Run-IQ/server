/* eslint-disable no-console */
/**
 * Standalone entry point for Docker / direct `node dist/standalone.js` usage.
 *
 * Reads configuration from environment variables:
 *   PORT       – HTTP port            (default 3000)
 *   HOST       – Bind address         (default 0.0.0.0)
 *   LOG_LEVEL  – info|warn|error|silent (default info)
 *   STRICT     – Snapshot strict mode (default true)
 *   PLUGINS    – Comma-separated list (e.g. "fiscal")
 *   DSLS       – Comma-separated list (e.g. "jsonlogic")
 */

import type { PPEPlugin, DSLEvaluator } from '@run-iq/core';
import { start } from './server.js';

const PLUGIN_MAP: Record<string, string> = {
  fiscal: '@run-iq/plugin-fiscal',
};

const DSL_MAP: Record<string, string> = {
  jsonlogic: '@run-iq/dsl-jsonlogic',
};

export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseLogLevel(value: string | undefined): 'info' | 'warn' | 'error' | 'silent' {
  const valid = ['info', 'warn', 'error', 'silent'] as const;
  if (value && (valid as readonly string[]).includes(value)) {
    return value as (typeof valid)[number];
  }
  return 'info';
}

export async function loadPlugins(names: string[]): Promise<PPEPlugin[]> {
  const plugins: PPEPlugin[] = [];
  for (const name of names) {
    const pkg = PLUGIN_MAP[name];
    if (!pkg) {
      console.warn(`Unknown plugin "${name}", skipping.`);
      continue;
    }
    try {
      const mod: Record<string, unknown> = await import(pkg);
      const PluginClass = mod['default'] ?? mod[Object.keys(mod)[0]!];
      if (typeof PluginClass === 'function') {
        plugins.push(new (PluginClass as new () => PPEPlugin)());
      }
    } catch {
      console.warn(`Plugin "${name}" (${pkg}) not installed, skipping.`);
    }
  }
  return plugins;
}

export async function loadDSLs(names: string[]): Promise<DSLEvaluator[]> {
  const dsls: DSLEvaluator[] = [];
  for (const name of names) {
    const pkg = DSL_MAP[name];
    if (!pkg) {
      console.warn(`Unknown DSL "${name}", skipping.`);
      continue;
    }
    try {
      const mod: Record<string, unknown> = await import(pkg);
      const EvaluatorClass = mod['default'] ?? mod[Object.keys(mod)[0]!];
      if (typeof EvaluatorClass === 'function') {
        dsls.push(new (EvaluatorClass as new () => DSLEvaluator)());
      }
    } catch {
      console.warn(`DSL "${name}" (${pkg}) not installed, skipping.`);
    }
  }
  return dsls;
}

async function main(): Promise<void> {
  const port = Number(process.env['PORT']) || 3000;
  const host = process.env['HOST'] ?? '0.0.0.0';
  const logLevel = parseLogLevel(process.env['LOG_LEVEL']);
  const strict = process.env['STRICT'] !== 'false';

  const pluginNames = parseList(process.env['PLUGINS']);
  const dslNames = parseList(process.env['DSLS']);

  const plugins = await loadPlugins(pluginNames);
  const dsls = await loadDSLs(dslNames);

  console.log(
    `Starting @run-iq/server — port=${String(port)} host=${host} plugins=[${plugins.map((p) => p.name).join(',')}] dsls=[${dsls.map((d) => d.dsl).join(',')}]`,
  );

  await start({ port, host, logLevel, strict, plugins, dsls });
}

main().catch((err: unknown) => {
  console.error('Failed to start @run-iq/server:', err);
  process.exit(1);
});
