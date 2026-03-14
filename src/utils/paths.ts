import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const VAULTVOICE_DIR = path.join(os.homedir(), '.vaultvoice');
const DB_FILE = path.join(VAULTVOICE_DIR, 'voiceprints.db');
const PYTHON_DIR = path.join(__dirname, '..', '..', 'python');

export function getVaultVoiceDir(): string {
  return VAULTVOICE_DIR;
}

export function getDbPath(): string {
  return DB_FILE;
}

export function getPythonDir(): string {
  return PYTHON_DIR;
}

export function getPythonScript(name: string): string {
  return path.join(PYTHON_DIR, name);
}

export function ensureVaultVoiceDir(): void {
  if (!fs.existsSync(VAULTVOICE_DIR)) {
    fs.mkdirSync(VAULTVOICE_DIR, { recursive: true });
  }
}

export function resolveAudioPath(audioPath: string): string {
  return path.resolve(audioPath);
}

export const SUPPORTED_FORMATS = ['.wav', '.mp3', '.ogg', '.flac', '.m4a'];

export function isSupportedFormat(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_FORMATS.includes(ext);
}
