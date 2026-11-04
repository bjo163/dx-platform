import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    include: [
      'packages/errors/test/**/*.spec.ts',
      'packages/job/test/**/*.spec.ts',
      'packages/config-api/test/**/*.spec.ts',
      'packages/shared/test/**/*.spec.ts',
      'packages/protocol/test/**/*.spec.ts',
      'packages/policy/test/**/*.spec.ts',
      'packages/tools/test/**/*.spec.ts',
      'packages/database/test/**/*.spec.ts',
      'packages/session/test/**/*.spec.ts',
      'packages/browser/test/**/*.spec.ts',
      'packages/artifacts/test/**/*.spec.ts',
      'packages/audio/test/**/*.spec.ts',
      'packages/cli/test/**/*.spec.ts',
      'packages/diagnostics/test/**/*.spec.ts',
      'packages/image/test/**/*.spec.ts',
      'packages/local/test/**/*.spec.ts',
      'packages/mcp/test/**/*.spec.ts',
      'packages/platform/test/**/*.spec.ts',
      'packages/plugins/test/**/*.spec.ts',
      'packages/shared/test/**/*.spec.ts',
      'apps/api/test/**/*.spec.ts',
    ],
    exclude: ['node_modules', 'dist'],
    typecheck: true,
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@wtagent/types': resolve(__dirname, 'packages/types/src'),
      '@wtagent/shared': resolve(__dirname, 'packages/shared/src'),
      '@wtagent/sdk': resolve(__dirname, 'packages/sdk/src'),
    },
  },
});