import chalk from 'chalk';
import { VoiceprintDB } from '../db/database';
import { formatSuccess, formatError } from '../utils/display';

export async function deleteCommand(options: { name: string }): Promise<void> {
  const db = new VoiceprintDB();

  try {
    const deleted = db.deleteProfile(options.name);

    if (deleted) {
      console.log('');
      console.log(formatSuccess(`  ✓ Profile "${options.name}" deleted.`));
      console.log('');
    } else {
      console.error(formatError(`\n  Error: Profile "${options.name}" not found.`));
      process.exit(1);
    }
  } finally {
    db.close();
  }
}
