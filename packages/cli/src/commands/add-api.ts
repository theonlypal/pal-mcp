import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadConfig,
  saveConfig,
  configExists,
  listProviders,
  getProvider,
  storeSecret,
  hasSecret,
  type ServiceConfig,
} from '@pal/core';

interface AddApiOptions {
  envVar?: string;
  id?: string;
}

export async function addApiCommand(
  providerArg: string | undefined,
  options: AddApiOptions
): Promise<void> {
  const projectPath = process.cwd();

  // Check if initialized
  if (!configExists(projectPath)) {
    console.log(chalk.red('✗ PAL is not initialized. Run `pal init` first.'));
    process.exit(1);
  }

  const config = loadConfig(projectPath);
  const providers = listProviders();

  // Select provider
  let providerId: string;

  if (providerArg) {
    const provider = getProvider(providerArg);
    if (!provider) {
      console.log(chalk.red(`✗ Unknown provider: ${providerArg}`));
      console.log(chalk.gray('Available providers:'));
      providers.forEach(p => console.log(chalk.gray(`  - ${p.id} (${p.name})`)));
      process.exit(1);
    }
    providerId = provider.id;
  } else {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select API provider:',
        choices: providers.map(p => ({
          name: `${p.name} (${p.defaultEnvVar})`,
          value: p.id,
        })),
      },
    ]);
    providerId = answer.provider;
  }

  const provider = getProvider(providerId)!;

  // Get service ID
  const serviceId = options.id || providerId;

  // Check if service already exists
  if (config.services.some(s => s.id === serviceId)) {
    console.log(chalk.yellow(`⚠️  Service "${serviceId}" already exists in config.`));
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to update it?',
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.gray('Aborted.'));
      return;
    }
    // Remove existing service
    config.services = config.services.filter(s => s.id !== serviceId);
  }

  // Get env var name
  const envVarKey = options.envVar || provider.defaultEnvVar;

  // Prompt for API key
  const secretKey = `${config.projectName}:${serviceId}`;
  const existingSecret = await hasSecret(secretKey);

  let apiKey: string | undefined;

  if (existingSecret) {
    console.log(chalk.gray(`  API key already stored for ${serviceId}`));
    const { updateKey } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'updateKey',
        message: 'Update the stored API key?',
        default: false,
      },
    ]);

    if (updateKey) {
      const { newKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'newKey',
          message: `Enter your ${provider.name} API key:`,
          mask: '*',
        },
      ]);
      apiKey = newKey;
    }
  } else {
    const { key } = await inquirer.prompt([
      {
        type: 'password',
        name: 'key',
        message: `Enter your ${provider.name} API key:`,
        mask: '*',
      },
    ]);
    apiKey = key;
  }

  // Store secret if provided
  if (apiKey) {
    const spinner = ora('Securely storing API key...').start();
    await storeSecret(secretKey, apiKey);
    spinner.succeed('API key stored securely');
  }

  // Add service to config
  const serviceConfig: ServiceConfig = {
    id: serviceId,
    provider: providerId,
    envVarKey,
    scopes: provider.scopes,
  };

  config.services.push(serviceConfig);
  saveConfig(projectPath, config);

  console.log(chalk.bold.green(`\n✓ Added ${provider.name} to project!\n`));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray(`  1. Run \`pal generate\` to create ${envVarKey} in ${config.envFile}`));
  console.log(chalk.gray(`  2. Run \`pal generate\` to create client code\n`));
}
