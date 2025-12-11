#!/usr/bin/env node
const { Command } = require('commander');
const { build } = require('./commands/build.cjs');

const program = new Command();
program.command('build').description('Build FarrisFlowDevkit').action(build);
program.parse();
