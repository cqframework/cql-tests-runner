#!/usr/bin/env node

import { Command } from 'commander';
import { BuildCommand } from '../commands/build-cql-command';
import { RunCommand } from '../commands/run-tests-command';
import { ServerCommand } from '../commands/server-command';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Read package.json to get version
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Find package.json by walking up the directory tree
let packageJsonPath = path.join(__dirname, 'package.json');
let currentDir = __dirname;
while (!fs.existsSync(packageJsonPath) && currentDir !== path.dirname(currentDir)) {
  currentDir = path.dirname(currentDir);
  packageJsonPath = path.join(currentDir, 'package.json');
}
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

program
  .name('cql-tests')
  .description('CLI tool for running CQL tests and building CQL libraries')
  .version(packageJson.version);

program
  .command('build-cql')
  .description('Build CQL library files from test definitions')
  .argument('<config>', 'Path to configuration file')
  .argument('<output>', 'Output path for generated CQL files')
  .action(async (configPath, outputPath) => {
    try {
      const buildCommand = new BuildCommand();
      await buildCommand.execute({ config: configPath, output: outputPath });
    } catch (error: any) {
      if (error.message.includes('Configuration validation failed')) {
        console.error('❌ Configuration validation failed. Please fix the errors above and try again.');
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('run-tests')
  .description('Run CQL tests against a FHIR server')
  .argument('<config>', 'Path to configuration file')
  .argument('<output>', 'Output path to write results files')
  .option('-v, --validate', 'Validate the results file before writing (does not prevent writing if invalid)')
  .action(async (configPath, outputPath, options) => {
    try {
      const runCommand = new RunCommand();
      await runCommand.execute({ config: configPath, output: outputPath, validate: options.validate });
    } catch (error: any) {
      if (error.message.includes('Configuration validation failed')) {
        console.error('❌ Configuration validation failed. Please fix the errors above and try again.');
        process.exit(1);
      }
      throw error;
    }
  });

program
  .command('server')
  .description('Start an Express server to run CQL tests via HTTP API')
  .option('-p, --port <number>', 'Port number for the server', '3000')
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      console.error('Error: Port must be a valid number between 1 and 65535');
      process.exit(1);
    }
    
    const serverCommand = new ServerCommand(port);
    await serverCommand.start();
  });

program.parse();
