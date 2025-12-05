#!/usr/bin/env node
import { program } from 'commander';
import { initCommand } from '../commands/init.js';
import { addApiCommand } from '../commands/add-api.js';
import { generateCommand } from '../commands/generate.js';
import { scanCommand } from '../commands/scan.js';
import { doctorCommand } from '../commands/doctor.js';

program
  .name('pal')
  .description('PAL - Project API Layer: Secure API key and service management')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize PAL in the current project')
  .option('-y, --yes', 'Skip prompts and use defaults')
  .action(initCommand);

program
  .command('add-api')
  .description('Add a new API/service to the project')
  .argument('[provider]', 'Provider name (e.g., openai, stripe, anthropic)')
  .option('--env-var <name>', 'Custom environment variable name')
  .option('--id <id>', 'Custom service ID')
  .action(addApiCommand);

program
  .command('generate')
  .description('Generate client code and update .env file')
  .option('--dry-run', 'Show what would be generated without writing files')
  .action(generateCommand);

program
  .command('scan')
  .description('Scan project for API usage and suggest configurations')
  .action(scanCommand);

program
  .command('doctor')
  .description('Check PAL setup and diagnose issues')
  .action(doctorCommand);

program.parse();
