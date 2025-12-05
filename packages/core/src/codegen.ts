import type { ServiceConfig, ProviderDefinition, GeneratedFileResult } from './types.js';
import { getProvider } from './providers.js';

type CodegenTemplate = ProviderDefinition['codegenTemplate'];

const templates: Record<CodegenTemplate, (service: ServiceConfig, provider: ProviderDefinition, ts: boolean) => string> = {
  openai: (service, provider, ts) => {
    if (ts) {
      return `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.${service.envVarKey},
});

export { openai };

// Example usage:
// const completion = await openai.chat.completions.create({
//   model: 'gpt-4',
//   messages: [{ role: 'user', content: 'Hello!' }],
// });
`;
    }
    return `const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.${service.envVarKey},
});

module.exports = { openai };

// Example usage:
// const completion = await openai.chat.completions.create({
//   model: 'gpt-4',
//   messages: [{ role: 'user', content: 'Hello!' }],
// });
`;
  },

  anthropic: (service, provider, ts) => {
    if (ts) {
      return `import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.${service.envVarKey},
});

export { anthropic };

// Example usage:
// const message = await anthropic.messages.create({
//   model: 'claude-sonnet-4-20250514',
//   max_tokens: 1024,
//   messages: [{ role: 'user', content: 'Hello!' }],
// });
`;
    }
    return `const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.${service.envVarKey},
});

module.exports = { anthropic };

// Example usage:
// const message = await anthropic.messages.create({
//   model: 'claude-sonnet-4-20250514',
//   max_tokens: 1024,
//   messages: [{ role: 'user', content: 'Hello!' }],
// });
`;
  },

  stripe: (service, provider, ts) => {
    if (ts) {
      return `import Stripe from 'stripe';

const stripe = new Stripe(process.env.${service.envVarKey}!, {
  apiVersion: '2023-10-16',
});

export { stripe };

// Example usage:
// const customer = await stripe.customers.create({
//   email: 'customer@example.com',
// });
`;
    }
    return `const Stripe = require('stripe');

const stripe = new Stripe(process.env.${service.envVarKey}, {
  apiVersion: '2023-10-16',
});

module.exports = { stripe };

// Example usage:
// const customer = await stripe.customers.create({
//   email: 'customer@example.com',
// });
`;
  },

  twilio: (service, provider, ts) => {
    if (ts) {
      return `import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.${service.envVarKey}!;

const client = twilio(accountSid, authToken);

export { client as twilio };

// Example usage:
// const message = await twilio.messages.create({
//   body: 'Hello from PAL!',
//   from: '+1234567890',
//   to: '+0987654321',
// });
`;
    }
    return `const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.${service.envVarKey};

const client = twilio(accountSid, authToken);

module.exports = { twilio: client };

// Example usage:
// const message = await twilio.messages.create({
//   body: 'Hello from PAL!',
//   from: '+1234567890',
//   to: '+0987654321',
// });
`;
  },

  'generic-http': (service, provider, ts) => {
    const varName = service.id.replace(/-/g, '_');
    if (ts) {
      return `// ${provider.name} client
// API Key: process.env.${service.envVarKey}

${provider.sdkPackage ? `import ${provider.sdkImport} from '${provider.sdkPackage}';` : ''}

const ${varName}ApiKey = process.env.${service.envVarKey};

export { ${varName}ApiKey };

// Configure your ${provider.name} client here
// Refer to ${provider.name} documentation for setup instructions
`;
    }
    return `// ${provider.name} client
// API Key: process.env.${service.envVarKey}

${provider.sdkPackage ? `const ${provider.sdkImport} = require('${provider.sdkPackage}');` : ''}

const ${varName}ApiKey = process.env.${service.envVarKey};

module.exports = { ${varName}ApiKey };

// Configure your ${provider.name} client here
// Refer to ${provider.name} documentation for setup instructions
`;
  },
};

export function generateClientCode(
  service: ServiceConfig,
  hasTypeScript: boolean
): GeneratedFileResult {
  const provider = getProvider(service.provider);

  if (!provider) {
    throw new Error(`Unknown provider: ${service.provider}`);
  }

  const template = templates[provider.codegenTemplate];
  const content = template(service, provider, hasTypeScript);
  const ext = hasTypeScript ? 'ts' : 'js';
  const filename = service.clientFile || `${service.id}-client.${ext}`;

  return {
    path: filename,
    content,
    created: true,
  };
}

export function generateAllClients(
  services: ServiceConfig[],
  hasTypeScript: boolean
): GeneratedFileResult[] {
  return services.map(service => generateClientCode(service, hasTypeScript));
}

export function getInstallCommand(
  providerId: string,
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'pip' | 'unknown'
): string | null {
  const provider = getProvider(providerId);
  if (!provider?.sdkPackage) return null;

  switch (packageManager) {
    case 'npm':
      return `npm install ${provider.sdkPackage}`;
    case 'pnpm':
      return `pnpm add ${provider.sdkPackage}`;
    case 'yarn':
      return `yarn add ${provider.sdkPackage}`;
    default:
      return `npm install ${provider.sdkPackage}`;
  }
}
