import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  detectFramework,
  suggestProjectName,
} from '../detect.js';

describe('detect', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pal-detect-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('detectFramework', () => {
    it('detects basic Node.js project', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project', dependencies: {} })
      );

      const result = detectFramework(tempDir);

      expect(result.framework).toBe('none');
      expect(result.hasTypeScript).toBe(false);
    });

    it('detects TypeScript', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          devDependencies: { typescript: '^5.0.0' }
        })
      );
      fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');

      const result = detectFramework(tempDir);

      expect(result.hasTypeScript).toBe(true);
    });

    it('detects Next.js', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { next: '^14.0.0', react: '^18.0.0' }
        })
      );

      const result = detectFramework(tempDir);

      expect(result.framework).toBe('nextjs');
      expect(result.language).toBe('node');
    });

    it('detects Express', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test-project',
          dependencies: { express: '^4.0.0' }
        })
      );

      const result = detectFramework(tempDir);

      expect(result.framework).toBe('express');
    });

    it('detects pnpm', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      fs.writeFileSync(path.join(tempDir, 'pnpm-lock.yaml'), '');

      const result = detectFramework(tempDir);

      expect(result.packageManager).toBe('pnpm');
    });

    it('detects yarn', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test-project' })
      );
      fs.writeFileSync(path.join(tempDir, 'yarn.lock'), '');

      const result = detectFramework(tempDir);

      expect(result.packageManager).toBe('yarn');
    });
  });

  describe('suggestProjectName', () => {
    it('extracts name from package.json', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'my-awesome-project' })
      );

      const name = suggestProjectName(tempDir);

      expect(name).toBe('my-awesome-project');
    });

    it('falls back to directory name', () => {
      const name = suggestProjectName(tempDir);

      expect(name).toBe(path.basename(tempDir));
    });
  });
});
