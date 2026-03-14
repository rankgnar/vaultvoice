import { spawn } from 'child_process';
import { getPythonScript } from '../utils/paths';

interface PythonResult {
  [key: string]: any;
}

function findPython(): string {
  // Prefer python3, fall back to python
  return 'python3';
}

function runPythonScript(scriptName: string, args: string[]): Promise<PythonResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = getPythonScript(scriptName);
    const python = findPython();

    const proc = spawn(python, [scriptPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (err: Error) => {
      if ((err as any).code === 'ENOENT') {
        reject(new Error(
          'Python 3 not found. Please install Python 3 and ensure it is on your PATH.\n' +
          'Install Python dependencies: pip install -r python/requirements.txt'
        ));
      } else {
        reject(new Error(`Failed to start Python process: ${err.message}`));
      }
    });

    proc.on('close', (code: number | null) => {
      if (code !== 0) {
        const errorMsg = stderr.trim() || `Python script exited with code ${code}`;
        // Try to parse error from stdout
        try {
          const result = JSON.parse(stdout);
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
        } catch {
          // Not JSON, use stderr
        }
        reject(new Error(errorMsg));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch {
        reject(new Error(`Invalid output from Python script: ${stdout.substring(0, 200)}`));
      }
    });
  });
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  method: string;
}

export interface AudioAnalysis {
  duration: number;
  snr_db: number;
  quality: string;
  spectral_features: {
    centroid_hz: number;
    rolloff_hz: number;
    flatness: number;
    harmonic_ratio: number;
    natural_harmonics: boolean;
  };
}

export interface DeepfakeResult {
  deepfake_score: number;
  artifacts: string[];
  confidence: string;
  spectral_description: string;
  component_scores: Record<string, number>;
}

export async function extractEmbedding(audioPath: string): Promise<EmbeddingResult> {
  return runPythonScript('extract_embeddings.py', [
    '--audio', audioPath,
    '--output', 'json',
  ]) as Promise<EmbeddingResult>;
}

export async function analyzeAudio(audioPath: string): Promise<AudioAnalysis> {
  return runPythonScript('analyze_audio.py', [
    '--audio', audioPath,
    '--output', 'json',
  ]) as Promise<AudioAnalysis>;
}

export async function detectDeepfake(audioPath: string): Promise<DeepfakeResult> {
  return runPythonScript('deepfake_detect.py', [
    '--audio', audioPath,
    '--output', 'json',
  ]) as Promise<DeepfakeResult>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const minLen = Math.min(a.length, b.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < minLen; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
