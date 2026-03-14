import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { VoiceprintDB } from '../db/database';
import {
  extractEmbedding,
  analyzeAudio,
  detectDeepfake,
  cosineSimilarity,
} from '../audio/processor';
import { resolveAudioPath, isSupportedFormat } from '../utils/paths';
import {
  formatError,
  formatVerdict,
  formatSpeakerMatch,
  formatDeepfakeScore,
  formatQuality,
  formatLabel,
} from '../utils/display';

const MATCH_THRESHOLD = 85;

export async function verifyCommand(options: { profile: string; audio: string }): Promise<void> {
  const { profile: profileName, audio } = options;
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
    const storedProfile = db.getProfile(profileName);
    if (!storedProfile) {
      console.error(formatError(`\n  Error: Profile "${profileName}" not found. Use 'vaultvoice list' to see profiles.`));
      process.exit(1);
    }

    const fileName = path.basename(audioPath);
    console.log(`\n🔍 Analyzing: ${chalk.bold(fileName)}\n`);

    const spinner = ora({ text: 'Extracting speaker embedding...', indent: 2 }).start();

    // Run all analyses in parallel
    const [embeddingResult, analysisResult, deepfakeResult] = await Promise.all([
      extractEmbedding(audioPath),
      analyzeAudio(audioPath),
      detectDeepfake(audioPath),
    ]);

    spinner.stop();

    // Calculate speaker match
    const similarity = cosineSimilarity(storedProfile.embedding, embeddingResult.embedding);
    const matchPercent = Math.max(0, Math.min(100, similarity * 100));

    const isAuthentic = matchPercent >= MATCH_THRESHOLD && deepfakeResult.deepfake_score < 0.5;

    // Display results in the exact specified format
    console.log(`Speaker Match:     ${formatSpeakerMatch(matchPercent, MATCH_THRESHOLD)}`);
    console.log(`Deepfake Score:    ${formatDeepfakeScore(deepfakeResult.deepfake_score)}`);
    console.log(`Verdict:           ${formatVerdict(isAuthentic, profileName)}`);
    console.log('');
    console.log(chalk.bold('Details:'));
    console.log(formatLabel('Duration:', `${analysisResult.duration}s`));
    console.log(formatLabel('Quality:', formatQuality(analysisResult.quality, analysisResult.snr_db)));
    console.log(formatLabel('Spectral:', deepfakeResult.spectral_description));

    const artifactStr = deepfakeResult.artifacts.join(', ');
    console.log(formatLabel('Artifacts:', artifactStr));

    if (!isAuthentic) {
      console.log(formatLabel('Confidence:', deepfakeResult.confidence));
    }

    console.log('');
  } catch (err: any) {
    console.error(formatError(`\n  Error: ${err.message}`));
    process.exit(1);
  } finally {
    db.close();
  }
}
