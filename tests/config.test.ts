import { describe, it, expect } from 'vitest';
import { resolveConfig } from '../src/config.js';

describe('resolveConfig', () => {
  it('applies defaults when no overrides', () => {
    const config = resolveConfig({ plugins: [], dsls: [] });

    expect(config.port).toBe(3000);
    expect(config.host).toBe('0.0.0.0');
    expect(config.logLevel).toBe('info');
    expect(config.strict).toBe(true);
    expect(config.snapshot).toBeUndefined();
    expect(config.timeout).toBeUndefined();
  });

  it('respects explicit overrides', () => {
    const config = resolveConfig({
      plugins: [],
      dsls: [],
      port: 8080,
      host: '127.0.0.1',
      logLevel: 'error',
      strict: false,
      timeout: { dsl: 50, hook: 200, pipeline: 3000 },
    });

    expect(config.port).toBe(8080);
    expect(config.host).toBe('127.0.0.1');
    expect(config.logLevel).toBe('error');
    expect(config.strict).toBe(false);
    expect(config.timeout).toEqual({ dsl: 50, hook: 200, pipeline: 3000 });
  });

  it('preserves plugin and dsl references', () => {
    const plugins = [{ name: 'p', version: '1.0.0', onInit() {} }];
    const dsls = [
      {
        dsl: 'd',
        version: '1.0.0',
        evaluate() {
          return true;
        },
      },
    ];

    const config = resolveConfig({ plugins, dsls });

    expect(config.plugins).toBe(plugins);
    expect(config.dsls).toBe(dsls);
  });

  it('keeps strict true by default', () => {
    const config = resolveConfig({ plugins: [], dsls: [] });
    expect(config.strict).toBe(true);
  });

  it('allows strict false', () => {
    const config = resolveConfig({ plugins: [], dsls: [], strict: false });
    expect(config.strict).toBe(false);
  });

  it('supports silent log level', () => {
    const config = resolveConfig({ plugins: [], dsls: [], logLevel: 'silent' });
    expect(config.logLevel).toBe('silent');
  });

  it('supports warn log level', () => {
    const config = resolveConfig({ plugins: [], dsls: [], logLevel: 'warn' });
    expect(config.logLevel).toBe('warn');
  });
});
