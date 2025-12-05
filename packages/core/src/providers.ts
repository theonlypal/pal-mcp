import type { ProviderDefinition } from './types.js';

export const PROVIDERS: Record<string, ProviderDefinition> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultEnvVar: 'OPENAI_API_KEY',
    sdkPackage: 'openai',
    sdkImport: 'OpenAI',
    scopes: ['chat', 'embeddings', 'images', 'audio', 'assistants'],
    codegenTemplate: 'openai',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultEnvVar: 'ANTHROPIC_API_KEY',
    sdkPackage: '@anthropic-ai/sdk',
    sdkImport: 'Anthropic',
    scopes: ['messages', 'completions'],
    codegenTemplate: 'anthropic',
  },
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    defaultEnvVar: 'STRIPE_SECRET_KEY',
    sdkPackage: 'stripe',
    sdkImport: 'Stripe',
    scopes: ['payments', 'subscriptions', 'customers', 'invoices'],
    codegenTemplate: 'stripe',
  },
  twilio: {
    id: 'twilio',
    name: 'Twilio',
    defaultEnvVar: 'TWILIO_AUTH_TOKEN',
    sdkPackage: 'twilio',
    sdkImport: 'Twilio',
    scopes: ['sms', 'voice', 'verify'],
    codegenTemplate: 'twilio',
  },
  sendgrid: {
    id: 'sendgrid',
    name: 'SendGrid',
    defaultEnvVar: 'SENDGRID_API_KEY',
    sdkPackage: '@sendgrid/mail',
    sdkImport: 'sgMail',
    scopes: ['email'],
    codegenTemplate: 'generic-http',
  },
  resend: {
    id: 'resend',
    name: 'Resend',
    defaultEnvVar: 'RESEND_API_KEY',
    sdkPackage: 'resend',
    sdkImport: 'Resend',
    scopes: ['email'],
    codegenTemplate: 'generic-http',
  },
  supabase: {
    id: 'supabase',
    name: 'Supabase',
    defaultEnvVar: 'SUPABASE_SERVICE_KEY',
    sdkPackage: '@supabase/supabase-js',
    sdkImport: 'createClient',
    scopes: ['database', 'auth', 'storage'],
    codegenTemplate: 'generic-http',
  },
  firebase: {
    id: 'firebase',
    name: 'Firebase',
    defaultEnvVar: 'FIREBASE_SERVICE_ACCOUNT',
    sdkPackage: 'firebase-admin',
    sdkImport: 'admin',
    scopes: ['firestore', 'auth', 'storage', 'messaging'],
    codegenTemplate: 'generic-http',
  },
  aws: {
    id: 'aws',
    name: 'AWS',
    defaultEnvVar: 'AWS_SECRET_ACCESS_KEY',
    sdkPackage: '@aws-sdk/client-s3',
    sdkImport: 'S3Client',
    scopes: ['s3', 'ses', 'lambda', 'dynamodb'],
    codegenTemplate: 'generic-http',
  },
  custom: {
    id: 'custom',
    name: 'Custom API',
    defaultEnvVar: 'API_KEY',
    sdkPackage: null,
    sdkImport: null,
    scopes: [],
    codegenTemplate: 'generic-http',
  },
};

export function getProvider(id: string): ProviderDefinition | undefined {
  return PROVIDERS[id.toLowerCase()];
}

export function listProviders(): ProviderDefinition[] {
  return Object.values(PROVIDERS);
}

export function getProviderByEnvVar(envVar: string): ProviderDefinition | undefined {
  return Object.values(PROVIDERS).find(p => p.defaultEnvVar === envVar);
}
