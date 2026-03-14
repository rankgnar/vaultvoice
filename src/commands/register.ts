import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { VoiceprintDB } from '../db/database';
import { extractEmbedding, analyzeAudio } from '../audio/processor';
import { resolveAudioPath, isSupportedFormat } from '../utils/paths';
import { formatSuccess, formatError } from '../utils/display';

export async function registerCommand(options: { name: string; audio: string }): Promise<void> {
  const { name, audio } = options;
  const audioPath = resolveAudioPath(audio);

  // Validate input
  if (!fs.existsSync(audioPath)) {
    console.error(formatError(`\n  Error: Audio file not found: ${audioPath}`));
    process.exit(1);
  }

  if (!isSupportedFormat(audioPath)) {
    console.error(formatError(`\n  Error: Unsupported audio format. Supported: .wav, .mp3, .ogg, .flac, .m4a`));
    process.exit(1);
  }

  const db = new VoiceprintDB();

  try {
    if (db.profileExists(name)) {
      console.error(formatError(`\n  Error: Profile "${name}" already exists. Delete it first to re-register.`));
      process.exit(1);
    }

    console.log('');
    const spinner = ora({ text: 'Analyzing audio sample...', indent: 2 }).start();

    // Extract embedding and analyze audio in parallel
    const [embeddingResult, analysisResult] = await Promise.all([
      extractEmbedding(audioPath),
      analyzeAudio(audioPath),
    ]);

    spinner.text = 'Creating voiceprint...';

    // Store in database
    db.addProfile(name, embeddingResult.embedding, analysisResult.duration);

    spinner.succeed(chalk.green('Voiceprint created successfully'));

    console.log('');
    console.log(`  ${chalk.dim('Profile:')}       ${chalk.cyan(name)}`);
    console.log(`  ${chalk.dim('Duration:')}      ${analysisResult.duration}s`);
    console.log(`  ${chalk.dim('Quality:')}       ${analysisResult.quality} (SNR: ${analysisResult.snr_db}dB)`);
    console.log(`  ${chalk.dim('Embedding:')}     ${embeddingResult.dimensions}-dim vector (${embeddingResult.method})`);
    console.log('');
    console.log(formatSuccess(`  ✓ Voice profile "${name}" registered and stored locally.`));
    console.log('');
  } catch (err: any) {
    console.error(formatError(`\n  Error: ${err.message}`));
    process.exit(1);
  } finally {
    db.close();
  }
}
