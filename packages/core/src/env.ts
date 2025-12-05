import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EnvResult } from './types.js';

export function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    // Remove surrounding quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

export function serializeEnvFile(env: Record<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    // Quote values that contain spaces, quotes, or special chars
    const needsQuotes = /[\s"'#=]/.test(value);
    const quotedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
    lines.push(`${key}=${quotedValue}`);
  }

  return lines.join('\n') + '\n';
}

export function updateEnvFile(
  projectPath: string,
  updates: Record<string, string>,
  envFileName = '.env'
): EnvResult {
  const envPath = path.join(projectPath, envFileName);
  const result: EnvResult = {
    path: envPath,
    created: false,
    updated: [],
    skipped: [],
  };

  let existing: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    existing = parseEnvFile(content);
  } else {
    result.created = true;
  }

  for (const [key, value] of Object.entries(updates)) {
    if (key in existing && existing[key] !== '') {
      // Key exists and has a value - skip to avoid overwriting
      result.skipped.push(key);
    } else {
      existing[key] = value;
      result.updated.push(key);
    }
  }

  fs.writeFileSync(envPath, serializeEnvFile(existing), 'utf-8');

  return result;
}

export function readEnvFile(projectPath: string, envFileName = '.env'): Record<string, string> {
  const envPath = path.join(projectPath, envFileName);

  if (!fs.existsSync(envPath)) {
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  return parseEnvFile(content);
}

export function envFileExists(projectPath: string, envFileName = '.env'): boolean {
  return fs.existsSync(path.join(projectPath, envFileName));
}

export function ensureGitignoreHasEnv(projectPath: string, envFileName = '.env'): boolean {
  const gitignorePath = path.join(projectPath, '.gitignore');

  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const lines = content.split('\n').map(l => l.trim());

  // Check if env file is already ignored
  if (lines.includes(envFileName) || lines.includes('*.env') || lines.includes('.env*')) {
    return false;
  }

  // Add env file to gitignore
  const newContent = content.trimEnd() + '\n\n# Environment variables\n' + envFileName + '\n';
  fs.writeFileSync(gitignorePath, newContent, 'utf-8');

  return true;
}
