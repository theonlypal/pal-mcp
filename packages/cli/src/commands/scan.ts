import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadConfig,
  configExists,
  readEnvFile,
  listProviders,
  getProviderByEnvVar,
  type ScanResult,
} from '@pal/core';

// Patterns to detect API usage in code
const API_PATTERNS: Record<string, RegExp[]> = {
  openai: [
    /new\s+OpenAI\s*\(/,
    /from\s+['"]openai['"]/,
    /require\s*\(\s*['"]openai['"]\s*\)/,
    /OPENAI_API_KEY/,
  ],
  anthropic: [
    /new\s+Anthropic\s*\(/,
    /from\s+['"]@anthropic-ai\/sdk['"]/,
    /require\s*\(\s*['"]@anthropic-ai\/sdk['"]\s*\)/,
    /ANTHROPIC_API_KEY/,
  ],
  stripe: [
    /new\s+Stripe\s*\(/,
    /from\s+['"]stripe['"]/,
    /require\s*\(\s*['"]stripe['"]\s*\)/,
    /STRIPE_SECRET_KEY/,
    /STRIPE_API_KEY/,
  ],
  twilio: [
    /twilio\s*\(/,
    /from\s+['"]twilio['"]/,
    /require\s*\(\s*['"]twilio['"]\s*\)/,
    /TWILIO_AUTH_TOKEN/,
  ],
  sendgrid: [
    /sgMail/,
    /from\s+['"]@sendgrid\/mail['"]/,
    /SENDGRID_API_KEY/,
  ],
  supabase: [
    /createClient\s*\(/,
    /from\s+['"]@supabase\/supabase-js['"]/,
    /SUPABASE_/,
  ],
  firebase: [
    /firebase-admin/,
    /initializeApp/,
    /FIREBASE_/,
  ],
};

function scanFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const detected: string[] = [];

  for (const [provider, patterns] of Object.entries(API_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        if (!detected.includes(provider)) {
          detected.push(provider);
        }
        break;
      }
    }
  }

  return detected;
}

function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    // Skip node_modules, .git, dist, etc
    if (item.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'venv'].includes(item.name)) {
        continue;
      }
      files.push(...walkDir(fullPath, extensions));
    } else if (item.isFile()) {
      const ext = path.extname(item.name);
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

export async function scanCommand(): Promise<void> {
  const projectPath = process.cwd();

  console.log(chalk.bold('\n🔍 PAL Scan\n'));

  const spinner = ora('Scanning project files...').start();

  // Find source files
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py'];
  const files = walkDir(projectPath, extensions);

  // Scan each file
  const detectedProviders = new Set<string>();

  for (const file of files) {
    const providers = scanFile(file);
    providers.forEach(p => detectedProviders.add(p));
  }

  spinner.succeed(`Scanned ${files.length} files`);

  // Check env file
  const envVars = readEnvFile(projectPath);
  const envProviders = new Set<string>();

  for (const envVar of Object.keys(envVars)) {
    const provider = getProviderByEnvVar(envVar);
    if (provider) {
      envProviders.add(provider.id);
    }
  }

  // Load config if exists
  let configuredServices: string[] = [];
  if (configExists(projectPath)) {
    const config = loadConfig(projectPath);
    configuredServices = config.services.map(s => s.provider);
  }

  // Build result
  const result: ScanResult = {
    configured: configuredServices,
    missing: [],
    unused: [],
    suggestions: [],
  };

  // Find missing (detected in code but not configured)
  for (const provider of detectedProviders) {
    if (!configuredServices.includes(provider)) {
      result.missing.push(provider);
    }
  }

  // Find unused (configured but not detected in code)
  for (const provider of configuredServices) {
    if (!detectedProviders.has(provider)) {
      result.unused.push(provider);
    }
  }

  // Generate suggestions
  for (const provider of result.missing) {
    result.suggestions.push(`Run \`pal add-api ${provider}\` to configure ${provider}`);
  }

  // Output results
  console.log();

  if (detectedProviders.size > 0) {
    console.log(chalk.bold('Detected API usage:'));
    for (const provider of detectedProviders) {
      const status = configuredServices.includes(provider)
        ? chalk.green('✓ configured')
        : chalk.yellow('⚠ not configured');
      console.log(`   ${provider}: ${status}`);
    }
  } else {
    console.log(chalk.gray('No API usage detected in code.'));
  }

  if (result.missing.length > 0) {
    console.log(chalk.bold('\n📋 Suggestions:'));
    result.suggestions.forEach(s => console.log(chalk.cyan(`   ${s}`)));
  }

  if (result.unused.length > 0) {
    console.log(chalk.bold('\nUnused configurations:'));
    result.unused.forEach(p => console.log(chalk.gray(`   ${p} (configured but not detected in code)`)));
  }

  if (Object.keys(envVars).length > 0) {
    console.log(chalk.bold('\nEnvironment variables found:'));
    for (const [key, value] of Object.entries(envVars)) {
      const hasValue = value && value !== '' && !value.includes('your_') && !value.includes('_here');
      const status = hasValue ? chalk.green('✓') : chalk.yellow('○');
      console.log(`   ${status} ${key}`);
    }
  }

  console.log();
}
