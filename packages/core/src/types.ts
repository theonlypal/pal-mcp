import { z } from 'zod';

export const ServiceConfigSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  envVarKey: z.string().min(1),
  scopes: z.array(z.string()).optional(),
  clientFile: z.string().optional(),
});

export const PalConfigSchema = z.object({
  projectName: z.string().min(1),
  language: z.enum(['node', 'python', 'other']),
  framework: z.enum(['none', 'express', 'nextjs', 'fastapi', 'other']),
  envFile: z.string().default('.env'),
  services: z.array(ServiceConfigSchema).default([]),
});

export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
export type PalConfig = z.infer<typeof PalConfigSchema>;

export interface FrameworkInfo {
  language: PalConfig['language'];
  framework: PalConfig['framework'];
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'unknown';
  hasTypeScript: boolean;
}

export interface EnvResult {
  path: string;
  created: boolean;
  updated: string[];
  skipped: string[];
}

export interface GeneratedFileResult {
  path: string;
  content: string;
  created: boolean;
}

export interface ScanResult {
  configured: string[];
  missing: string[];
  unused: string[];
  suggestions: string[];
}

export interface ProviderDefinition {
  id: string;
  name: string;
  defaultEnvVar: string;
  sdkPackage: string | null;
  sdkImport: string | null;
  scopes: string[];
  codegenTemplate: 'openai' | 'anthropic' | 'stripe' | 'twilio' | 'generic-http';
}

export interface KeystoreEntry {
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface KeystoreData {
  version: number;
  masterKeyInKeychain: boolean;
  secrets: Record<string, KeystoreEntry>;
}
