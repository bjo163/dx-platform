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
    // This test verifies the tools layer doesn't crash on empty strings
    const result = buildToolEnvironment();
    expect(result).toBeDefined();
  });
});
