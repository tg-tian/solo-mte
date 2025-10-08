#!/usr/bin/env node
import { Command, Option } from 'commander';
import { buildLibs } from './commands/build.js';

const program = new Command();

program.command('build').description('构建Command Code Editor库').action(buildLibs);

program.parse();
