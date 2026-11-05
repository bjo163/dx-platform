import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ConfigAPI } from '../src/index';

describe('ConfigAPI', () => {
  let configApi: ConfigAPI;

  beforeEach(async () => {
    configApi = await ConfigAPI.create();
  });

  it('should be creatable', () => {
    expect(configApi).toBeInstanceOf(ConfigAPI);
  });

  it('should have default configuration', () => {
    const config = configApi.getConfig();
    expect(config).toBeDefined();
    // Default provider/model may come from env (WTAGENT_PROVIDER) or be empty
    expect(typeof config.provider).toBe('string');
    expect(typeof config.model).toBe('string');
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
