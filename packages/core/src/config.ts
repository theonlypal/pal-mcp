import * as fs from 'node:fs';
import * as path from 'node:path';
import { PalConfigSchema, type PalConfig } from './types.js';

const CONFIG_FILENAME = 'pal.config.json';

export function getConfigPath(projectPath: string): string {
  return path.join(projectPath, CONFIG_FILENAME);
}

export function configExists(projectPath: string): boolean {
  return fs.existsSync(getConfigPath(projectPath));
}

export function loadConfig(projectPath: string): PalConfig {
  const configPath = getConfigPath(projectPath);

  if (!fs.existsSync(configPath)) {
    throw new Error(`No pal.config.json found in ${projectPath}. Run 'pal init' first.`);
  }

  const raw = fs.readFileSync(configPath, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in ${configPath}`);
  }

  const result = PalConfigSchema.safeParse(parsed);

  if (!result.success) {
    const errors = result.error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n');
    throw new Error(`Invalid pal.config.json:\n${errors}`);
  }

  return result.data;
}

export function saveConfig(projectPath: string, config: PalConfig): void {
  const configPath = getConfigPath(projectPath);

  // Validate before saving
  const result = PalConfigSchema.safeParse(config);
  if (!result.success) {
    throw new Error('Invalid config data');
  }

  fs.writeFileSync(configPath, JSON.stringify(result.data, null, 2) + '\n', 'utf-8');
}

export function createDefaultConfig(projectName: string): PalConfig {
  return {
    projectName,
    language: 'node',
    framework: 'none',
    envFile: '.env',
    services: [],
  };
}
