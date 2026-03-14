import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { analyzeAudio, detectDeepfake } from '../audio/processor';
import { resolveAudioPath, isSupportedFormat } from '../utils/paths';
import {
  formatError,
  formatDeepfakeScore,
  formatQuality,
  formatLabel,
} from '../utils/display';

export async function scanCommand(options: { audio: string }): Promise<void> {
  const audioPath = resolveAudioPath(options.audio);

  if (!fs.existsSync(audioPath)) {
    console.error(formatError(`\n  Error: Audio file not found: ${audioPath}`));
    process.exit(1);
  }

  if (!isSupportedFormat(audioPath)) {
    console.error(formatError(`\n  Error: Unsupported audio format. Supported: .wav, .mp3, .ogg, .flac, .m4a`));
    process.exit(1);
  }

  const fileName = path.basename(audioPath);
  console.log(`\n🔍 Scanning: ${chalk.bold(fileName)}\n`);

  const spinner = ora({ text: 'Analyzing audio for deepfake indicators...', indent: 2 }).start();

  try {
    const [analysisResult, deepfakeResult] = await Promise.all([
      analyzeAudio(audioPath),
      detectDeepfake(audioPath),
    ]);

    spinner.stop();

    const isLikelyFake = deepfakeResult.deepfake_score >= 0.5;

    console.log(`Deepfake Score:    ${formatDeepfakeScore(deepfakeResult.deepfake_score)}`);

    if (isLikelyFake) {
      console.log(`Verdict:           ${chalk.bold.red('🔴 SUSPICIOUS — Likely AI-generated audio')}`);
    } else {
      console.log(`Verdict:           ${chalk.bold.green('✅ CLEAN — No significant deepfake indicators')}`);
    }

    console.log('');
    console.log(chalk.bold('Details:'));
    console.log(formatLabel('Duration:', `${analysisResult.duration}s`));
    console.log(formatLabel('Quality:', formatQuality(analysisResult.quality, analysisResult.snr_db)));
    console.log(formatLabel('Spectral:', deepfakeResult.spectral_description));

    const artifactStr = deepfakeResult.artifacts.join(', ');
    console.log(formatLabel('Artifacts:', artifactStr));
    console.log(formatLabel('Confidence:', deepfakeResult.confidence));
    console.log('');
  } catch (err: any) {
    spinner.fail('Analysis failed');
    console.error(formatError(`\n  Error: ${err.message}`));
    process.exit(1);
  }
}
