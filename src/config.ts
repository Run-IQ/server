import type { PPEPlugin, DSLEvaluator, ISnapshotAdapter } from '@run-iq/core';

export interface ServerConfig {
  readonly port: number;
  readonly host: string;
  readonly plugins: PPEPlugin[];
  readonly dsls: DSLEvaluator[];
  readonly snapshot?: ISnapshotAdapter | undefined;
  readonly strict?: boolean | undefined;
  readonly timeout?:
    | {
        readonly dsl?: number | undefined;
        readonly hook?: number | undefined;
        readonly pipeline?: number | undefined;
      }
    | undefined;
  readonly logLevel?: 'info' | 'warn' | 'error' | 'silent' | undefined;
}

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_LOG_LEVEL = 'info';

export function resolveConfig(
  partial: Partial<ServerConfig> & Pick<ServerConfig, 'plugins' | 'dsls'>,
): ServerConfig {
  return {
    port: partial.port ?? DEFAULT_PORT,
    host: partial.host ?? DEFAULT_HOST,
    plugins: partial.plugins,
    dsls: partial.dsls,
    snapshot: partial.snapshot,
    strict: partial.strict ?? true,
    timeout: partial.timeout,
    logLevel: partial.logLevel ?? DEFAULT_LOG_LEVEL,
  };
}
