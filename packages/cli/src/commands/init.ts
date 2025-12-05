import * as path from 'node:path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import {
  configExists,
  saveConfig,
  createDefaultConfig,
  detectFramework,
  suggestProjectName,
  ensureGitignoreHasEnv,
  type PalConfig,
} from '@pal/core';

interface InitOptions {
  yes?: boolean;
}

export async function initCommand(options: InitOptions): Promise<void> {
  const projectPath = process.cwd();

  console.log(chalk.bold('\n🔧 PAL - Project API Layer Setup\n'));

  // Check if already initialized
  if (configExists(projectPath)) {
    console.log(chalk.yellow('⚠️  PAL is already initialized in this project.'));
    console.log(chalk.gray(`   Config: ${path.join(projectPath, 'pal.config.json')}`));
    return;
  }

  // Detect framework
  const spinner = ora('Detecting project configuration...').start();
  const detected = detectFramework(projectPath);
  const suggestedName = suggestProjectName(projectPath);
  spinner.succeed('Project analyzed');

  console.log(chalk.gray(`   Language: ${detected.language}`));
  console.log(chalk.gray(`   Framework: ${detected.framework}`));
  console.log(chalk.gray(`   TypeScript: ${detected.hasTypeScript ? 'Yes' : 'No'}`));
  console.log(chalk.gray(`   Package Manager: ${detected.packageManager}`));
  console.log();

  let config: PalConfig;

  if (options.yes) {
    // Use defaults
    config = {
      projectName: suggestedName,
      language: detected.language,
      framework: detected.framework,
      envFile: '.env',
      services: [],
    };
  } else {
    // Interactive prompts
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: suggestedName,
      },
      {
        type: 'list',
        name: 'language',
        message: 'Primary language:',
        choices: [
          { name: 'Node.js', value: 'node' },
          { name: 'Python', value: 'python' },
          { name: 'Other', value: 'other' },
        ],
        default: detected.language,
      },
      {
        type: 'list',
        name: 'framework',
        message: 'Framework:',
        choices: [
          { name: 'None', value: 'none' },
          { name: 'Express', value: 'express' },
          { name: 'Next.js', value: 'nextjs' },
          { name: 'FastAPI', value: 'fastapi' },
          { name: 'Other', value: 'other' },
        ],
        default: detected.framework,
      },
      {
        type: 'input',
        name: 'envFile',
        message: 'Environment file:',
        default: '.env',
      },
    ]);

    config = {
      projectName: answers.projectName,
      language: answers.language,
      framework: answers.framework,
      envFile: answers.envFile,
      services: [],
    };
  }

  // Save config
  const saveSpinner = ora('Creating pal.config.json...').start();
  saveConfig(projectPath, config);
  saveSpinner.succeed('Created pal.config.json');

  // Ensure .env is in .gitignore
  const gitignoreUpdated = ensureGitignoreHasEnv(projectPath, config.envFile);
  if (gitignoreUpdated) {
    console.log(chalk.green(`✓ Added ${config.envFile} to .gitignore`));
  }

  console.log(chalk.bold.green('\n✓ PAL initialized successfully!\n'));
  console.log(chalk.gray('Next steps:'));
  console.log(chalk.gray('  1. Run `pal add-api openai` to add an API'));
  console.log(chalk.gray('  2. Run `pal generate` to generate client code'));
  console.log(chalk.gray('  3. Run `pal scan` to find existing API usage\n'));
}
