import { describe, it, expect, vi } from 'vitest';

// Mock modules at the top level with importOriginal
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
  };
});

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    join: vi.fn((...args) => args.join('/')),
  };
});

vi.mock('@wtagent/shared/atomic-write', () => ({
  replaceFileAtomic: vi.fn(),
}));

describe('Mock test', () => {
  it('should mock fs functions', async () => {
    const fs = await import('node:fs/promises');
    expect(fs.mkdir).toBeInstanceOf(Function);
    await fs.mkdir('/test');
    expect(fs.mkdir).toHaveBeenCalledWith('/test');
  });
});