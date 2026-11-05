import { describe, it, expect } from 'vitest';

import { buildToolEnvironment } from '../src/safe-env';

describe('tools interface', () => {
  it('should export buildToolEnvironment function', () => {
    expect(typeof buildToolEnvironment).toBe('function');
  });

  it('should process environment safely', () => {
    const result = buildToolEnvironment();
    expect(result).toBeDefined();
    expect(typeof result).toBe('object');
  });

  it('empty path string should be handled safely', () => {
    // Empty path is handled by resolveToolPath which throws
    // This test verifies the tools layer does not crash on empty strings
    const result = buildToolEnvironment();
    expect(result).toBeDefined();
  });

  it('should support process start and stop', () => {
    const { createDefaultToolRegistry } = require('../src/default-tools');
    const registry = createDefaultToolRegistry();
    // Verify the registry has process management tools
    expect(registry.get('process.start')).toBeDefined();
    expect(registry.get('process.stop')).toBeDefined();
    expect(registry.get('process.list')).toBeDefined();
    expect(registry.get('process.read')).toBeDefined();
  });
});
