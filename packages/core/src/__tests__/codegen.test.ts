import { describe, it, expect } from 'vitest';
import {
  generateClientCode,
  generateAllClients,
  getInstallCommand,
} from '../codegen.js';
import type { ServiceConfig } from '../types.js';

describe('codegen', () => {
  describe('generateClientCode', () => {
    it('generates TypeScript code for OpenAI', () => {
      const service: ServiceConfig = {
        id: 'openai',
        provider: 'openai',
        envVarKey: 'OPENAI_API_KEY',
      };

      const result = generateClientCode(service, true);

      expect(result.path).toBe('openai-client.ts');
      expect(result.content).toContain('import OpenAI');
      expect(result.content).toContain('process.env.OPENAI_API_KEY');
      expect(result.content).toContain('export { openai }');
    });

    it('generates JavaScript code for OpenAI', () => {
      const service: ServiceConfig = {
        id: 'openai',
        provider: 'openai',
        envVarKey: 'OPENAI_API_KEY',
      };

      const result = generateClientCode(service, false);

      expect(result.path).toBe('openai-client.js');
      expect(result.content).toContain("require('openai')");
      expect(result.content).toContain('module.exports');
    });

    it('generates Anthropic client', () => {
      const service: ServiceConfig = {
        id: 'anthropic',
        provider: 'anthropic',
        envVarKey: 'ANTHROPIC_API_KEY',
      };

      const result = generateClientCode(service, true);

      expect(result.path).toBe('anthropic-client.ts');
      expect(result.content).toContain('Anthropic');
      expect(result.content).toContain('ANTHROPIC_API_KEY');
    });

    it('generates Stripe client', () => {
      const service: ServiceConfig = {
        id: 'stripe',
        provider: 'stripe',
        envVarKey: 'STRIPE_SECRET_KEY',
      };

      const result = generateClientCode(service, true);

      expect(result.path).toBe('stripe-client.ts');
      expect(result.content).toContain('Stripe');
      expect(result.content).toContain('STRIPE_SECRET_KEY');
    });

    it('generates generic HTTP client for custom provider', () => {
      const service: ServiceConfig = {
        id: 'my-api',
        provider: 'custom',
        envVarKey: 'MY_API_KEY',
      };

      const result = generateClientCode(service, true);

      expect(result.path).toBe('my-api-client.ts');
      expect(result.content).toContain('Custom API client');
      expect(result.content).toContain('MY_API_KEY');
    });
  });

  describe('generateAllClients', () => {
    it('generates multiple clients', () => {
      const services: ServiceConfig[] = [
        { id: 'openai', provider: 'openai', envVarKey: 'OPENAI_API_KEY' },
        { id: 'stripe', provider: 'stripe', envVarKey: 'STRIPE_SECRET_KEY' },
      ];

      const results = generateAllClients(services, true);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.path)).toContain('openai-client.ts');
      expect(results.map(r => r.path)).toContain('stripe-client.ts');
    });
  });

  describe('getInstallCommand', () => {
    it('returns npm install command', () => {
      const cmd = getInstallCommand('openai', 'npm');
      expect(cmd).toBe('npm install openai');
    });

    it('returns pnpm add command', () => {
      const cmd = getInstallCommand('openai', 'pnpm');
      expect(cmd).toBe('pnpm add openai');
    });

    it('returns yarn add command', () => {
      const cmd = getInstallCommand('stripe', 'yarn');
      expect(cmd).toBe('yarn add stripe');
    });

    it('returns null for custom provider', () => {
      const cmd = getInstallCommand('custom', 'npm');
      expect(cmd).toBeNull();
    });
  });
});
