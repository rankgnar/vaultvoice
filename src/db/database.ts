import Database from 'better-sqlite3';
import { getDbPath, ensureVaultVoiceDir } from '../utils/paths';

export interface Profile {
  id: number;
  name: string;
  embedding: number[];
  audio_duration: number | null;
  created_at: string;
  sample_count: number;
}

export class VoiceprintDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    ensureVaultVoiceDir();
    this.db = new Database(dbPath || getDbPath());
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        embedding BLOB NOT NULL,
        audio_duration REAL,
        created_at TEXT DEFAULT (datetime('now')),
        sample_count INTEGER DEFAULT 1
      )
    `);
  }

  addProfile(name: string, embedding: number[], duration: number | null): void {
    const stmt = this.db.prepare(
      'INSERT INTO profiles (name, embedding, audio_duration) VALUES (?, ?, ?)'
    );
    stmt.run(name, JSON.stringify(embedding), duration);
  }

  getProfile(name: string): Profile | undefined {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE name = ?');
    const row = stmt.get(name) as any;
    if (!row) return undefined;
    return {
      ...row,
      embedding: JSON.parse(row.embedding),
    };
  }

  listProfiles(): Profile[] {
    const stmt = this.db.prepare(
      'SELECT id, name, audio_duration, created_at, sample_count FROM profiles ORDER BY created_at DESC'
    );
    return stmt.all() as Profile[];
  }

  deleteProfile(name: string): boolean {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE name = ?');
    const result = stmt.run(name);
    return result.changes > 0;
  }

  profileExists(name: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM profiles WHERE name = ?');
    return !!stmt.get(name);
  }

  close(): void {
    this.db.close();
  }
}
