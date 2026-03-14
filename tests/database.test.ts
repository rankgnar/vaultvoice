import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VoiceprintDB } from '../src/db/database';

describe('VoiceprintDB', () => {
  let db: VoiceprintDB;
  let tmpDir: string;
  let dbPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultvoice-test-'));
    dbPath = path.join(tmpDir, 'test.db');
    db = new VoiceprintDB(dbPath);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('addProfile', () => {
    it('should add a new profile', () => {
      const embedding = Array(256).fill(0).map((_, i) => i / 256);
      db.addProfile('test-voice', embedding, 10.5);

      const profile = db.getProfile('test-voice');
      expect(profile).toBeDefined();
      expect(profile!.name).toBe('test-voice');
      expect(profile!.embedding).toEqual(embedding);
      expect(profile!.audio_duration).toBe(10.5);
    });

    it('should reject duplicate names', () => {
      const embedding = [0.1, 0.2, 0.3];
      db.addProfile('duplicate', embedding, 5.0);

      expect(() => {
        db.addProfile('duplicate', embedding, 5.0);
      }).toThrow();
    });
  });

  describe('getProfile', () => {
    it('should return undefined for non-existent profile', () => {
      const profile = db.getProfile('nonexistent');
      expect(profile).toBeUndefined();
    });

    it('should return the correct profile', () => {
      const embedding = [0.5, 0.6, 0.7];
      db.addProfile('my-voice', embedding, 8.2);

      const profile = db.getProfile('my-voice');
      expect(profile).toBeDefined();
      expect(profile!.name).toBe('my-voice');
      expect(profile!.embedding).toEqual(embedding);
      expect(profile!.sample_count).toBe(1);
    });
  });

  describe('listProfiles', () => {
    it('should return empty array when no profiles exist', () => {
      const profiles = db.listProfiles();
      expect(profiles).toEqual([]);
    });

    it('should list all profiles', () => {
      db.addProfile('voice-a', [0.1], 5.0);
      db.addProfile('voice-b', [0.2], 10.0);

      const profiles = db.listProfiles();
      expect(profiles).toHaveLength(2);
      const names = profiles.map((p) => p.name);
      expect(names).toContain('voice-a');
      expect(names).toContain('voice-b');
    });
  });

  describe('deleteProfile', () => {
    it('should delete an existing profile', () => {
      db.addProfile('to-delete', [0.1, 0.2], 3.0);
      expect(db.profileExists('to-delete')).toBe(true);

      const deleted = db.deleteProfile('to-delete');
      expect(deleted).toBe(true);
      expect(db.profileExists('to-delete')).toBe(false);
    });

    it('should return false for non-existent profile', () => {
      const deleted = db.deleteProfile('ghost');
      expect(deleted).toBe(false);
    });
  });

  describe('profileExists', () => {
    it('should return false for non-existent profile', () => {
      expect(db.profileExists('nope')).toBe(false);
    });

    it('should return true for existing profile', () => {
      db.addProfile('exists', [0.1], 1.0);
      expect(db.profileExists('exists')).toBe(true);
    });
  });
});
