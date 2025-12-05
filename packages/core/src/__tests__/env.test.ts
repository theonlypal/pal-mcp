import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  readEnvFile,
  updateEnvFile,
  envFileExists,
} from '../env.js';

describe('env', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-env-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('envFileExists', () => {
    it('returns false when env file does not exist', () => {
      expect(envFileExists(tempDir)).toBe(false);
    });

    it('returns true when env file exists', () => {
      fs.writeFileSync(path.join(tempDir, '.env'), 'KEY=value');
      expect(envFileExists(tempDir)).toBe(true);
    });

    it('respects custom env file name', () => {
      fs.writeFileSync(path.join(tempDir, '.env.local'), 'KEY=value');
      expect(envFileExists(tempDir, '.env.local')).toBe(true);
      expect(envFileExists(tempDir, '.env')).toBe(false);
    });
  });

  describe('readEnvFile', () => {
    it('returns empty object when file does not exist', () => {
      const vars = readEnvFile(tempDir);
      expect(vars).toEqual({});
    });

    it('parses env file correctly', () => {
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        'API_KEY=secret123\nDATABASE_URL=postgres://localhost\n'
      );

      const vars = readEnvFile(tempDir);
      expect(vars.API_KEY).toBe('secret123');
      expect(vars.DATABASE_URL).toBe('postgres://localhost');
    });

    it('handles quoted values', () => {
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        'QUOTED="hello world"\nSINGLE=\'test\'\n'
      );

      const vars = readEnvFile(tempDir);
      expect(vars.QUOTED).toBe('hello world');
      expect(vars.SINGLE).toBe('test');
    });

    it('ignores comments', () => {
      fs.writeFileSync(
        path.join(tempDir, '.env'),
        '# This is a comment\nKEY=value\n# Another comment\n'
      );

      const vars = readEnvFile(tempDir);
      expect(vars.KEY).toBe('value');
      expect(Object.keys(vars)).toHaveLength(1);
    });
  });

  describe('updateEnvFile', () => {
    it('creates new env file', () => {
      const result = updateEnvFile(tempDir, { API_KEY: 'secret' });

      expect(result.created).toBe(true);
      expect(result.updated).toContain('API_KEY');
      expect(fs.existsSync(path.join(tempDir, '.env'))).toBe(true);
    });

    it('updates existing env file', () => {
      fs.writeFileSync(path.join(tempDir, '.env'), 'EXISTING=value\n');

      const result = updateEnvFile(tempDir, { NEW_KEY: 'new_value' });

      expect(result.created).toBe(false);
      expect(result.updated).toContain('NEW_KEY');

      const content = fs.readFileSync(path.join(tempDir, '.env'), 'utf-8');
      expect(content).toContain('EXISTING=value');
      expect(content).toContain('NEW_KEY=new_value');
    });

    it('skips existing keys', () => {
      fs.writeFileSync(path.join(tempDir, '.env'), 'API_KEY=existing\n');

      const result = updateEnvFile(tempDir, { API_KEY: 'new_value' });

      expect(result.skipped).toContain('API_KEY');
      expect(result.updated).not.toContain('API_KEY');

      const content = fs.readFileSync(path.join(tempDir, '.env'), 'utf-8');
      expect(content).toContain('API_KEY=existing');
    });
  });
});
