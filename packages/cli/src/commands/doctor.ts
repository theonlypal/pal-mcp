import * as fs from 'node:fs';
import * as path from 'node:path';
import chalk from 'chalk';
import {
  configExists,
  loadConfig,
  envFileExists,
  readEnvFile,
  getKeystoreInfo,
  hasSecret,
  getProvider,
  detectFramework,
} from '@pal/core';

interface Check {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
}

export async function doctorCommand(): Promise<void> {
  const projectPath = process.cwd();

  console.log(chalk.bold('\n🩺 PAL Doctor\n'));

  const checks: Check[] = [];

  // Check 1: Config file exists
  if (configExists(projectPath)) {
    checks.push({
      name: 'PAL Config',
      status: 'pass',
      message: 'pal.config.json found',
    });
  } else {
    checks.push({
      name: 'PAL Config',
      status: 'fail',
      message: 'pal.config.json not found. Run `pal init`',
    });
    // Can't continue without config
    printChecks(checks);
    return;
  }

  const config = loadConfig(projectPath);
  const framework = detectFramework(projectPath);

  // Check 2: Services configured
  if (config.services.length > 0) {
    checks.push({
      name: 'Services',
      status: 'pass',
      message: `${config.services.length} service(s) configured`,
    });
  } else {
    checks.push({
      name: 'Services',
      status: 'warn',
      message: 'No services configured. Run `pal add-api`',
    });
  }

  // Check 3: Env file exists
  if (envFileExists(projectPath, config.envFile)) {
    checks.push({
      name: 'Env File',
      status: 'pass',
      message: `${config.envFile} exists`,
    });
  } else {
    checks.push({
      name: 'Env File',
      status: 'warn',
      message: `${config.envFile} not found. Run \`pal generate\``,
    });
  }

  // Check 4: Keystore
  const keystoreInfo = getKeystoreInfo();
  if (keystoreInfo.usingKeychain) {
    checks.push({
      name: 'Keystore',
      status: 'pass',
      message: 'Using OS keychain (secure)',
    });
  } else {
    checks.push({
      name: 'Keystore',
      status: 'warn',
      message: 'Using file-based encryption (keytar not available)',
    });
  }

  // Check 5: Each service has stored key
  const envVars = readEnvFile(projectPath, config.envFile);

  for (const service of config.services) {
    const secretKey = `${config.projectName}:${service.id}`;
    const hasStoredKey = await hasSecret(secretKey);
    const provider = getProvider(service.provider);
    const hasEnvValue = envVars[service.envVarKey] &&
      envVars[service.envVarKey] !== '' &&
      !envVars[service.envVarKey].includes('your_') &&
      !envVars[service.envVarKey].includes('_here');

    if (hasStoredKey && hasEnvValue) {
      checks.push({
        name: `${provider?.name || service.id}`,
        status: 'pass',
        message: `Key stored & ${service.envVarKey} set`,
      });
    } else if (hasStoredKey) {
      checks.push({
        name: `${provider?.name || service.id}`,
        status: 'warn',
        message: `Key stored but ${service.envVarKey} not in env file. Run \`pal generate\``,
      });
    } else if (hasEnvValue) {
      checks.push({
        name: `${provider?.name || service.id}`,
        status: 'warn',
        message: `${service.envVarKey} set but not in PAL keystore`,
      });
    } else {
      checks.push({
        name: `${provider?.name || service.id}`,
        status: 'fail',
        message: `No key configured. Run \`pal add-api ${service.provider}\``,
      });
    }
  }

  // Check 6: .gitignore has .env
  const gitignorePath = path.join(projectPath, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (gitignore.includes(config.envFile) || gitignore.includes('.env')) {
      checks.push({
        name: 'Gitignore',
        status: 'pass',
        message: `${config.envFile} is gitignored`,
      });
    } else {
      checks.push({
        name: 'Gitignore',
        status: 'warn',
        message: `${config.envFile} not in .gitignore (security risk!)`,
      });
    }
  }

  // Check 7: Client files exist
  const clientDir = path.join(projectPath, 'src', 'lib');
  let clientsGenerated = 0;

  for (const service of config.services) {
    const ext = framework.hasTypeScript ? 'ts' : 'js';
    const clientFile = service.clientFile || `${service.id}-client.${ext}`;
    const clientPath = path.join(clientDir, clientFile);

    if (fs.existsSync(clientPath)) {
      clientsGenerated++;
    }
  }

  if (config.services.length > 0) {
    if (clientsGenerated === config.services.length) {
      checks.push({
        name: 'Client Code',
        status: 'pass',
        message: 'All client files generated',
      });
    } else if (clientsGenerated > 0) {
      checks.push({
        name: 'Client Code',
        status: 'warn',
        message: `${clientsGenerated}/${config.services.length} client files generated`,
      });
    } else {
      checks.push({
        name: 'Client Code',
        status: 'warn',
        message: 'No client files generated. Run `pal generate`',
      });
    }
  }

  printChecks(checks);

  // Summary
  const failures = checks.filter(c => c.status === 'fail').length;
  const warnings = checks.filter(c => c.status === 'warn').length;

  console.log();
  if (failures > 0) {
    console.log(chalk.red(`✗ ${failures} issue(s) need attention`));
  } else if (warnings > 0) {
    console.log(chalk.yellow(`⚠ ${warnings} warning(s)`));
  } else {
    console.log(chalk.green('✓ All checks passed!'));
  }
  console.log();
}

function printChecks(checks: Check[]): void {
  for (const check of checks) {
    let icon: string;
    let color: typeof chalk;

    switch (check.status) {
      case 'pass':
        icon = '✓';
        color = chalk.green;
        break;
      case 'warn':
        icon = '⚠';
        color = chalk.yellow;
        break;
      case 'fail':
        icon = '✗';
        color = chalk.red;
        break;
    }

    console.log(`${color(icon)} ${chalk.bold(check.name)}: ${chalk.gray(check.message)}`);
  }
}
