import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import {
  loadConfig,
  configExists,
  detectFramework,
  updateEnvFile,
  generateAllClients,
  getSecret,
  getInstallCommand,
  getProvider,
} from '@pal/core';

interface GenerateOptions {
  dryRun?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const projectPath = process.cwd();

  // Check if initialized
  if (!configExists(projectPath)) {
    console.log(chalk.red('✗ PAL is not initialized. Run `pal init` first.'));
    process.exit(1);
  }

  const config = loadConfig(projectPath);
  const framework = detectFramework(projectPath);

  if (config.services.length === 0) {
    console.log(chalk.yellow('⚠️  No services configured. Run `pal add-api` first.'));
    return;
  }

  console.log(chalk.bold('\n🔧 PAL Generate\n'));

  if (options.dryRun) {
    console.log(chalk.cyan('DRY RUN - No files will be modified\n'));
  }

  // Collect env updates
  const envUpdates: Record<string, string> = {};
  const installCommands: string[] = [];

  for (const service of config.services) {
    const secretKey = `${config.projectName}:${service.id}`;
    const apiKey = await getSecret(secretKey);

    if (apiKey) {
      envUpdates[service.envVarKey] = apiKey;
    } else {
      envUpdates[service.envVarKey] = `your_${service.provider}_key_here`;
      console.log(chalk.yellow(`⚠️  No stored key for ${service.id}, using placeholder`));
    }

    // Collect install commands
    const installCmd = getInstallCommand(service.provider, framework.packageManager);
    if (installCmd && !installCommands.includes(installCmd)) {
      installCommands.push(installCmd);
    }
  }

  // Update .env file
  if (!options.dryRun) {
    const spinner = ora(`Updating ${config.envFile}...`).start();
    const result = updateEnvFile(projectPath, envUpdates, config.envFile);

    if (result.created) {
      spinner.succeed(`Created ${config.envFile}`);
    } else {
      spinner.succeed(`Updated ${config.envFile}`);
    }

    if (result.updated.length > 0) {
      console.log(chalk.green(`   Added: ${result.updated.join(', ')}`));
    }
    if (result.skipped.length > 0) {
      console.log(chalk.gray(`   Skipped (already set): ${result.skipped.join(', ')}`));
    }
  } else {
    console.log(chalk.gray(`Would update ${config.envFile}:`));
    Object.entries(envUpdates).forEach(([key, value]) => {
      const masked = value.length > 8 ? value.slice(0, 4) + '****' : '****';
      console.log(chalk.gray(`   ${key}=${masked}`));
    });
  }

  // Generate client files
  console.log();
  const clients = generateAllClients(config.services, framework.hasTypeScript);

  const clientDir = path.join(projectPath, 'src', 'lib');

  for (const client of clients) {
    const clientPath = path.join(clientDir, client.path);

    if (!options.dryRun) {
      // Ensure directory exists
      const dir = path.dirname(clientPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Check if file exists
      if (fs.existsSync(clientPath)) {
        console.log(chalk.gray(`   Skipped: ${client.path} (already exists)`));
        continue;
      }

      fs.writeFileSync(clientPath, client.content, 'utf-8');
      console.log(chalk.green(`✓ Created: src/lib/${client.path}`));
    } else {
      console.log(chalk.gray(`Would create: src/lib/${client.path}`));
    }
  }

  // Show install commands
  if (installCommands.length > 0) {
    console.log(chalk.bold('\n📦 SDK Packages to install:\n'));
    installCommands.forEach(cmd => {
      console.log(chalk.cyan(`   ${cmd}`));
    });
  }

  console.log(chalk.bold.green('\n✓ Generation complete!\n'));
}
