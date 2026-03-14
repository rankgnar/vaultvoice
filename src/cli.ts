#!/usr/bin/env node

import { Command } from 'commander';
import { registerCommand } from './commands/register';
import { verifyCommand } from './commands/verify';
import { listCommand } from './commands/list';
import { deleteCommand } from './commands/delete';
import { scanCommand } from './commands/scan';
import { printBanner } from './utils/display';

const program = new Command();

program
  .name('vaultvoice')
  .description('Local CLI for voice deepfake protection — register your voice, detect AI clones')
  .version('0.1.0')
  .hook('preAction', () => {
    printBanner();
  });

program
  .command('register')
  .description('Create a voiceprint from an audio sample')
  .requiredOption('--name <name>', 'Name for the voice profile')
  .requiredOption('--audio <path>', 'Path to audio sample (.wav, .mp3, .ogg, .flac, .m4a)')
  .action(registerCommand);

program
  .command('verify')
  .description('Compare audio against a stored voiceprint to detect deepfakes')
  .requiredOption('--profile <name>', 'Name of the voice profile to compare against')
  .requiredOption('--audio <path>', 'Path to suspicious audio file')
  .action(verifyCommand);

program
  .command('list')
  .description('List all registered voice profiles')
  .action(listCommand);

program
  .command('delete')
  .description('Delete a voice profile')
  .requiredOption('--name <name>', 'Name of the profile to delete')
  .action(deleteCommand);

program
  .command('scan')
  .description('Scan an audio file for deepfake indicators (no profile needed)')
  .requiredOption('--audio <path>', 'Path to audio file to scan')
  .action(scanCommand);

program.parse();
