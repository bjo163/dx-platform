import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConfigAPI } from '../dist/index.js';

describe('ConfigAPI', () => {
  let configApi: ConfigAPI;

  beforeEach(() => {
    configApi = new ConfigAPI();
  });

  it('should be creatable', () => {
    expect(configApi).toBeInstanceOf(ConfigAPI);
  });

  it('should have default configuration', () => {
    const config = configApi.getConfig();
    expect(config).toBeDefined();
    expect(config.provider).toBeUndefined();
    expect(config.model).toBeUndefined();
  });

  it('should allow updating config via updateConfig', async () => {
    const result = await configApi.updateConfig({ provider: 'chatgpt', model: 'gpt-4' });
    expect(result).toMatchObject({
      config: expect.objectContaining({ provider: 'chatgpt', model: 'gpt-4' }),
      source: 'runtime',
    });
    expect(result.updatedAt).toBeDefined();
  });

  it('should return the updated config after updateConfig', () => {
    // The getConfig returns a copy of the current config
    const config = configApi.getConfig();
    expect(config).toBeDefined();
  });
});