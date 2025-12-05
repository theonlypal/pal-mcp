import { describe, it, expect } from 'vitest';
import {
  getProvider,
  listProviders,
  getProviderByEnvVar,
} from '../providers.js';

describe('providers', () => {
  describe('getProvider', () => {
    it('returns provider for valid id', () => {
      const provider = getProvider('openai');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('OpenAI');
      expect(provider?.defaultEnvVar).toBe('OPENAI_API_KEY');
    });

    it('returns undefined for invalid id', () => {
      expect(getProvider('nonexistent')).toBeUndefined();
    });

    it('has all expected providers', () => {
      const expectedIds = [
        'openai', 'anthropic', 'stripe', 'twilio',
        'sendgrid', 'resend', 'supabase', 'firebase', 'aws', 'custom'
      ];

      for (const id of expectedIds) {
        expect(getProvider(id)).toBeDefined();
      }
    });
  });

  describe('listProviders', () => {
    it('returns array of providers', () => {
      const providers = listProviders();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers.length).toBeGreaterThan(0);
    });

    it('each provider has required fields', () => {
      const providers = listProviders();
      for (const provider of providers) {
        expect(provider.id).toBeDefined();
        expect(provider.name).toBeDefined();
        expect(provider.defaultEnvVar).toBeDefined();
      }
    });
  });

  describe('getProviderByEnvVar', () => {
    it('finds provider by env var', () => {
      const provider = getProviderByEnvVar('OPENAI_API_KEY');
      expect(provider).toBeDefined();
      expect(provider?.id).toBe('openai');
    });

    it('returns undefined for unknown env var', () => {
      expect(getProviderByEnvVar('UNKNOWN_KEY')).toBeUndefined();
    });
  });
});
