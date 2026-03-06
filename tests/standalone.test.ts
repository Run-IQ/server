import { describe, it, expect, vi } from 'vitest';
import { parseList, parseLogLevel, loadPlugins, loadDSLs } from '../src/standalone.js';

describe('parseList', () => {
  it('returns empty array for undefined', () => {
    expect(parseList(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parseList('')).toEqual([]);
  });

  it('parses single value', () => {
    expect(parseList('fiscal')).toEqual(['fiscal']);
  });

  it('parses comma-separated values', () => {
    expect(parseList('fiscal,payroll')).toEqual(['fiscal', 'payroll']);
  });

  it('trims whitespace around values', () => {
    expect(parseList(' fiscal , payroll ')).toEqual(['fiscal', 'payroll']);
  });

  it('filters empty segments from trailing commas', () => {
    expect(parseList('fiscal,,payroll,')).toEqual(['fiscal', 'payroll']);
  });
});

describe('parseLogLevel', () => {
  it('defaults to info for undefined', () => {
    expect(parseLogLevel(undefined)).toBe('info');
  });

  it('defaults to info for invalid value', () => {
    expect(parseLogLevel('debug')).toBe('info');
    expect(parseLogLevel('verbose')).toBe('info');
    expect(parseLogLevel('')).toBe('info');
  });

  it('accepts info', () => {
    expect(parseLogLevel('info')).toBe('info');
  });

  it('accepts warn', () => {
    expect(parseLogLevel('warn')).toBe('warn');
  });

  it('accepts error', () => {
    expect(parseLogLevel('error')).toBe('error');
  });

  it('accepts silent', () => {
    expect(parseLogLevel('silent')).toBe('silent');
  });
});

describe('loadPlugins', () => {
  it('returns empty array for empty names', async () => {
    const result = await loadPlugins([]);
    expect(result).toEqual([]);
  });

  it('warns and skips unknown plugin names', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadPlugins(['nonexistent']);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown plugin'));
    spy.mockRestore();
  });

  it('warns and skips when plugin package is not installed', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadPlugins(['fiscal']);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not installed'));
    spy.mockRestore();
  });
});

describe('loadDSLs', () => {
  it('returns empty array for empty names', async () => {
    const result = await loadDSLs([]);
    expect(result).toEqual([]);
  });

  it('warns and skips unknown DSL names', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadDSLs(['unknown-dsl']);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('Unknown DSL'));
    spy.mockRestore();
  });

  it('warns and skips when DSL package is not installed', async () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await loadDSLs(['jsonlogic']);
    expect(result).toEqual([]);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('not installed'));
    spy.mockRestore();
  });
});
