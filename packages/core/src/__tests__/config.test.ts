import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  loadConfig,
  saveConfig,
  configExists,
  createDefaultConfig,
} from '../config.js';

describe('config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('configExists', () => {
    it('returns false when config does not exist', () => {
      expect(configExists(tempDir)).toBe(false);
    });

    it('returns true when config exists', () => {
      const configPath = path.join(tempDir, 'pal.config.json');
      fs.writeFileSync(configPath, JSON.stringify({ projectName: 'test' }));
      expect(configExists(tempDir)).toBe(true);
    });
  });

  describe('createDefaultConfig', () => {
    it('creates config with project name', () => {
      const config = createDefaultConfig('my-project');
      expect(config.projectName).toBe('my-project');
      expect(config.language).toBe('node');
      expect(config.framework).toBe('none');
      expect(config.envFile).toBe('.env');
      expect(config.services).toEqual([]);
    });
  });

  describe('saveConfig and loadConfig', () => {
    it('saves and loads config correctly', () => {
      const config = createDefaultConfig('test-project');
      config.services.push({
        id: 'openai',
        provider: 'openai',
        envVarKey: 'OPENAI_API_KEY',
      });

      saveConfig(tempDir, config);
      expect(configExists(tempDir)).toBe(true);

      const loaded = loadConfig(tempDir);
      expect(loaded.projectName).toBe('test-project');
      expect(loaded.services).toHaveLength(1);
      expect(loaded.services[0].id).toBe('openai');
    });

    it('throws error when loading non-existent config', () => {
      expect(() => loadConfig(tempDir)).toThrow();
    });
  });
});
