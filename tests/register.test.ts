import { isSupportedFormat, SUPPORTED_FORMATS } from '../src/utils/paths';
import { cosineSimilarity } from '../src/audio/processor';

describe('Audio format validation', () => {
  it('should accept supported formats', () => {
    expect(isSupportedFormat('sample.wav')).toBe(true);
    expect(isSupportedFormat('sample.mp3')).toBe(true);
    expect(isSupportedFormat('sample.ogg')).toBe(true);
    expect(isSupportedFormat('sample.flac')).toBe(true);
    expect(isSupportedFormat('sample.m4a')).toBe(true);
  });

  it('should reject unsupported formats', () => {
    expect(isSupportedFormat('sample.txt')).toBe(false);
    expect(isSupportedFormat('sample.pdf')).toBe(false);
    expect(isSupportedFormat('sample.aac')).toBe(false);
  });

  it('should handle uppercase extensions', () => {
    expect(isSupportedFormat('sample.WAV')).toBe(true);
    expect(isSupportedFormat('sample.MP3')).toBe(true);
  });

  it('should list all supported formats', () => {
    expect(SUPPORTED_FORMATS).toEqual(['.wav', '.mp3', '.ogg', '.flac', '.m4a']);
  });
});

describe('Cosine similarity', () => {
  it('should return 1 for identical vectors', () => {
    const vec = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
  });

  it('should return 0 for orthogonal vectors', () => {
    const a = [1, 0, 0];
    const b = [0, 1, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0, 5);
  });

  it('should return -1 for opposite vectors', () => {
    const a = [1, 2, 3];
    const b = [-1, -2, -3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0, 5);
  });

  it('should handle zero vectors gracefully', () => {
    const a = [0, 0, 0];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('should handle different length vectors by using minimum length', () => {
    const a = [1, 0];
    const b = [1, 0, 0, 0];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0, 5);
  });
});
