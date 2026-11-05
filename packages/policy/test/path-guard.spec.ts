import path from 'node:path';

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  isPathInside,
  assertWindowsSafeName,
} from '../src/path-guard';

describe('isPathInside', () => {
  it('should return true for same path', () => {
    expect(isPathInside('/project', '/project')).toBe(true);
  });

  it('should return true for nested path', () => {
    expect(isPathInside('/project', '/project/src/file.ts')).toBe(true);
  });

  it('should return false for parent path', () => {
    expect(isPathInside('/project', '/parent')).toBe(false);
  });

  it('should return false for sibling path', () => {
    expect(isPathInside('/project', '/sibling')).toBe(false);
  });

  it('treats an empty candidate as the current working directory', () => {
    expect(isPathInside(process.cwd(), '')).toBe(true);
  });

  it('resolves relative candidates against the current working directory', () => {
    expect(isPathInside(path.dirname(process.cwd()), 'src/file.ts')).toBe(true);
    expect(isPathInside(process.cwd(), path.join('..', 'outside.ts'))).toBe(false);
  });

  it('should handle Windows paths with platform option', () => {
    expect(isPathInside('C:\\project', 'C:\\project\\src\\file.ts', { platform: 'win32' })).toBe(true);
  });

  it('should handle Windows paths outside project', () => {
    expect(isPathInside('C:\\project', 'D:\\other\\file.ts', { platform: 'win32' })).toBe(false);
  });

  it('should handle Windows paths with forward slashes', () => {
    expect(isPathInside('C:\\project', 'C:/project/src/file.ts', { platform: 'win32' })).toBe(true);
  });

  it('should handle trailing slashes', () => {
    expect(isPathInside('/project/', '/project/file.ts')).toBe(true);
  });

  // The POSIX branch delegates to the host-native path.relative, so its
  // case-sensitivity can only be asserted on a case-sensitive host.
  it.runIf(process.platform !== 'win32')('is case-sensitive on POSIX', () => {
    expect(isPathInside('/Project', '/project/file.ts')).toBe(false);
    expect(isPathInside('/Project', '/Project/file.ts')).toBe(true);
  });

  it('is case-insensitive on Windows', () => {
    expect(isPathInside('C:\\Project', 'C:\\project\\file.ts', { platform: 'win32' })).toBe(true);
  });
});

describe('assertWindowsSafeName', () => {
  it('should not throw on non-Windows platform', () => {
    expect(() => assertWindowsSafeName('CON.txt', { platform: 'linux' })).not.toThrow();
  });

  it('should throw for reserved name CON on Windows', () => {
    expect(() => assertWindowsSafeName('CON.txt', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for reserved name PRN on Windows', () => {
    expect(() => assertWindowsSafeName('PRN', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for reserved name AUX on Windows', () => {
    expect(() => assertWindowsSafeName('AUX', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for reserved name NUL on Windows', () => {
    expect(() => assertWindowsSafeName('NUL.txt', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for COM1 on Windows', () => {
    expect(() => assertWindowsSafeName('COM1', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for LPT1 on Windows', () => {
    expect(() => assertWindowsSafeName('LPT1', { platform: 'win32' })).toThrow('reserved Windows device name');
  });

  it('should throw for illegal characters on Windows', () => {
    expect(() => assertWindowsSafeName('file<.txt', { platform: 'win32' })).toThrow('illegal on Windows');
  });

  it('should throw for illegal characters with pipe', () => {
    expect(() => assertWindowsSafeName('file|.txt', { platform: 'win32' })).toThrow('illegal on Windows');
  });

  it('should throw for trailing space on Windows', () => {
    // The function checks each component separately, and "file .txt" is treated as one component
    // The trailing space check applies to the leaf name only
    expect(() => assertWindowsSafeName('file ', { platform: 'win32' })).toThrow('ends with a space or period');
  });

  it('should throw for trailing period on Windows', () => {
    // The function checks each component separately
    expect(() => assertWindowsSafeName('file.', { platform: 'win32' })).toThrow('ends with a space or period');
  });

  it('should not throw for valid names on Windows', () => {
    expect(() => assertWindowsSafeName('valid_file.txt', { platform: 'win32' })).not.toThrow();
  });

  it('should not throw for valid names on non-Windows', () => {
    expect(() => assertWindowsSafeName('CON.txt', { platform: 'linux' })).not.toThrow();
  });

  it('should handle empty string', () => {
    expect(() => assertWindowsSafeName('', { platform: 'win32' })).not.toThrow();
  });

  it('should handle path with multiple components', () => {
    expect(() => assertWindowsSafeName('dir\\file.txt', { platform: 'win32' })).not.toThrow();
  });

  it('should check each component in path', () => {
    expect(() => assertWindowsSafeName('dir\\CON.txt', { platform: 'win32' })).toThrow('reserved Windows device name');
  });
});
