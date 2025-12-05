import * as fs from 'node:fs';
import * as path from 'node:path';
import type { FrameworkInfo, PalConfig } from './types.js';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(projectPath: string): PackageJson | null {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as PackageJson;
  } catch {
    return null;
  }
}

function hasDependency(pkg: PackageJson, name: string): boolean {
  return !!(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

function detectPackageManager(projectPath: string): FrameworkInfo['packageManager'] {
  if (fs.existsSync(path.join(projectPath, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(projectPath, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(projectPath, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml'))) return 'pip';
  return 'unknown';
}

function detectTypeScript(projectPath: string, pkg: PackageJson | null): boolean {
  if (fs.existsSync(path.join(projectPath, 'tsconfig.json'))) return true;
  if (pkg && hasDependency(pkg, 'typescript')) return true;
  return false;
}

export function detectFramework(projectPath: string): FrameworkInfo {
  const pkg = readPackageJson(projectPath);
  const packageManager = detectPackageManager(projectPath);

  // Python detection
  if (fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectPath, 'setup.py'))) {

    // Check for FastAPI
    const reqPath = path.join(projectPath, 'requirements.txt');
    if (fs.existsSync(reqPath)) {
      const reqs = fs.readFileSync(reqPath, 'utf-8');
      if (reqs.includes('fastapi')) {
        return {
          language: 'python',
          framework: 'fastapi',
          packageManager: 'pip',
          hasTypeScript: false,
        };
      }
    }

    return {
      language: 'python',
      framework: 'other',
      packageManager: 'pip',
      hasTypeScript: false,
    };
  }

  // Node.js detection
  if (pkg) {
    const hasTypeScript = detectTypeScript(projectPath, pkg);

    // Next.js
    if (hasDependency(pkg, 'next')) {
      return {
        language: 'node',
        framework: 'nextjs',
        packageManager,
        hasTypeScript,
      };
    }

    // Express
    if (hasDependency(pkg, 'express')) {
      return {
        language: 'node',
        framework: 'express',
        packageManager,
        hasTypeScript,
      };
    }

    // Generic Node.js
    return {
      language: 'node',
      framework: 'none',
      packageManager,
      hasTypeScript,
    };
  }

  // Unknown
  return {
    language: 'other',
    framework: 'other',
    packageManager: 'unknown',
    hasTypeScript: false,
  };
}

export function suggestProjectName(projectPath: string): string {
  const pkg = readPackageJson(projectPath);
  if (pkg && typeof (pkg as { name?: string }).name === 'string') {
    return (pkg as { name: string }).name;
  }
  return path.basename(projectPath);
}

export function getInstalledDependencies(projectPath: string): string[] {
  const pkg = readPackageJson(projectPath);
  if (!pkg) return [];

  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
}
