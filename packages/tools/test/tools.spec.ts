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
});
