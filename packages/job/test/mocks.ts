import { vi } from 'vitest';

export const mockFs = {
  mkdir: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
};

// Mock modules using vi.mock with importOriginal
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ...mockFs,
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