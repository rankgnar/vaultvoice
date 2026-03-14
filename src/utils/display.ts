import chalk from 'chalk';

export function formatHeader(text: string): string {
  return chalk.bold.cyan(text);
}

export function formatSuccess(text: string): string {
  return chalk.green(text);
}

export function formatError(text: string): string {
  return chalk.red(text);
}

export function formatWarning(text: string): string {
  return chalk.yellow(text);
}

export function formatDim(text: string): string {
  return chalk.dim(text);
}

export function formatLabel(label: string, value: string, pad: number = 19): string {
  return `  ${chalk.dim(label.padEnd(pad))}${value}`;
}

export function formatVerdict(
  isAuthentic: boolean,
  profileName: string
): string {
  if (isAuthentic) {
    return chalk.bold.green(
      `✅ AUTHENTIC — Likely real voice matching profile "${profileName}"`
    );
  }
  return chalk.bold.red(
    `🔴 SUSPICIOUS — Likely AI-generated or cloned voice`
  );
}

export function formatSpeakerMatch(
  match: number,
  threshold: number
): string {
  const matchStr = `${match.toFixed(1)}%`;
  const threshStr = `(threshold: ${threshold}%)`;
  if (match >= threshold) {
    return `${chalk.green(matchStr)} ${chalk.dim(threshStr)}`;
  }
  return `${chalk.red(matchStr)} ${chalk.dim(threshStr)}`;
}

export function formatDeepfakeScore(score: number): string {
  const scoreStr = score.toFixed(2);
  if (score >= 0.7) {
    return `${chalk.bold.red(scoreStr)} ${chalk.red('(HIGH RISK)')}`;
  } else if (score >= 0.4) {
    return `${chalk.yellow(scoreStr)} ${chalk.yellow('(medium risk)')}`;
  }
  return `${chalk.green(scoreStr)} ${chalk.green('(low risk)')}`;
}

export function formatQuality(quality: string, snr: number): string {
  const snrStr = `(SNR: ${snr}dB)`;
  switch (quality) {
    case 'Good':
      return `${chalk.green(quality)} ${chalk.dim(snrStr)}`;
    case 'Medium':
      return `${chalk.yellow(quality)} ${chalk.dim(snrStr)}`;
    default:
      return `${chalk.red(quality)} ${chalk.dim(snrStr)}`;
  }
}

export function formatProfileTable(
  profiles: Array<{ name: string; created_at: string; sample_count: number; audio_duration: number | null }>
): string {
  if (profiles.length === 0) {
    return chalk.dim('  No profiles registered yet.');
  }

  const header = `  ${chalk.bold('Name'.padEnd(20))}${chalk.bold('Created'.padEnd(22))}${chalk.bold('Samples'.padEnd(10))}${chalk.bold('Duration')}`;
  const separator = chalk.dim('  ' + '─'.repeat(65));

  const rows = profiles.map((p) => {
    const duration = p.audio_duration ? `${p.audio_duration.toFixed(1)}s` : 'N/A';
    return `  ${chalk.cyan(p.name.padEnd(20))}${chalk.dim(p.created_at.padEnd(22))}${String(p.sample_count).padEnd(10)}${duration}`;
  });

  return [header, separator, ...rows].join('\n');
}

export function printBanner(): void {
  console.log(chalk.cyan.bold(`
  ╦  ╦╔═╗╦ ╦╦ ╔╦╗╦  ╦╔═╗╦╔═╗╔═╗
  ╚╗╔╝╠═╣║ ║║  ║ ╚╗╔╝║ ║║║  ║╣
   ╚╝ ╩ ╩╚═╝╩═╝╩  ╚╝ ╚═╝╩╚═╝╚═╝
  `));
  console.log(chalk.dim('  Voice deepfake protection — local & private\n'));
}
