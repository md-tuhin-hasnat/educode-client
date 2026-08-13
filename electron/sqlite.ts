import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function initDatabase(userDataPath: string): Database.Database {
  if (db) return db;

  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }

  const dbPath = path.join(userDataPath, 'educode_offline.db');
  db = new Database(dbPath);

  // Enable WAL mode for high performance concurrent writes
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS offline_submissions (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      studentId TEXT NOT NULL,
      codeSnapshot TEXT NOT NULL,
      language TEXT NOT NULL,
      updatedAt INTEGER NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING'
    );

    CREATE TABLE IF NOT EXISTS offline_logs (
      id TEXT PRIMARY KEY,
      submissionId TEXT,
      eventType TEXT NOT NULL,
      details TEXT NOT NULL,
      severity TEXT NOT NULL,
      occurredAt INTEGER NOT NULL,
      syncStatus TEXT NOT NULL DEFAULT 'PENDING'
    );
  `);

  console.log(`[SQLite] Offline database initialized at: ${dbPath}`);
  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('[SQLite] Database not initialized! Call initDatabase() first.');
  }
  return db;
}
