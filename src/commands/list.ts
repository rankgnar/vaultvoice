import chalk from 'chalk';
import { VoiceprintDB } from '../db/database';
import { formatProfileTable, formatHeader } from '../utils/display';

export async function listCommand(): Promise<void> {
  const db = new VoiceprintDB();

  try {
    const profiles = db.listProfiles();

    console.log('');
    console.log(formatHeader('  Registered Voice Profiles'));
    console.log('');
    console.log(formatProfileTable(profiles));
    console.log('');

    if (profiles.length > 0) {
      console.log(chalk.dim(`  ${profiles.length} profile(s) stored in ~/.vaultvoice/`));
      console.log('');
    }
  } finally {
    db.close();
  }
}
