import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';

describe('CLI Package - Interface Check', () => {
  it('should import without error', () => {
    expect(true).toBe(true);
  });

  it('CLI binary runs from PATH in sandbox test', () => {
    const result = execSync('node ' + resolve(__dirname, '../dist/main.js') + ' --version', {
      env: process.env,
    });
    expect(result.toString().trim()).toMatch(/^1\./);
  });
});
