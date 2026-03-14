import {
  formatSpeakerMatch,
  formatDeepfakeScore,
  formatVerdict,
  formatQuality,
  formatProfileTable,
} from '../src/utils/display';
import chalk from 'chalk';

// Disable chalk colors for predictable test output
beforeAll(() => {
  chalk.level = 0;
});

describe('Display formatting', () => {
  describe('formatSpeakerMatch', () => {
    it('should format match above threshold', () => {
      const result = formatSpeakerMatch(92.3, 85);
      expect(result).toContain('92.3%');
      expect(result).toContain('threshold: 85%');
    });

    it('should format match below threshold', () => {
      const result = formatSpeakerMatch(78.1, 85);
      expect(result).toContain('78.1%');
      expect(result).toContain('threshold: 85%');
    });
  });

  describe('formatDeepfakeScore', () => {
    it('should show low risk for low scores', () => {
      const result = formatDeepfakeScore(0.12);
      expect(result).toContain('0.12');
      expect(result).toContain('low risk');
    });

    it('should show HIGH RISK for high scores', () => {
      const result = formatDeepfakeScore(0.87);
      expect(result).toContain('0.87');
      expect(result).toContain('HIGH RISK');
    });

    it('should show medium risk for medium scores', () => {
      const result = formatDeepfakeScore(0.5);
      expect(result).toContain('0.50');
      expect(result).toContain('medium risk');
    });
  });

  describe('formatVerdict', () => {
    it('should show AUTHENTIC for matching profiles', () => {
      const result = formatVerdict(true, 'my-voice');
      expect(result).toContain('AUTHENTIC');
      expect(result).toContain('my-voice');
    });

    it('should show SUSPICIOUS for non-matching', () => {
      const result = formatVerdict(false, 'my-voice');
      expect(result).toContain('SUSPICIOUS');
      expect(result).toContain('AI-generated');
    });
  });

  describe('formatQuality', () => {
    it('should format good quality', () => {
      const result = formatQuality('Good', 24);
      expect(result).toContain('Good');
      expect(result).toContain('SNR: 24dB');
    });

    it('should format medium quality', () => {
      const result = formatQuality('Medium', 18);
      expect(result).toContain('Medium');
      expect(result).toContain('SNR: 18dB');
    });
  });

  describe('formatProfileTable', () => {
    it('should show message for empty profiles', () => {
      const result = formatProfileTable([]);
      expect(result).toContain('No profiles registered');
    });

    it('should format profile rows', () => {
      const profiles = [
        { name: 'test-voice', created_at: '2024-01-15 10:30:00', sample_count: 1, audio_duration: 12.5 },
      ];
      const result = formatProfileTable(profiles);
      expect(result).toContain('test-voice');
      expect(result).toContain('12.5s');
    });
  });
});
