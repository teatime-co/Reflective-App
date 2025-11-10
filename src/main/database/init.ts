import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
import type Database from 'better-sqlite3';
import { SCHEMA_SQL } from './schema';

const require = createRequire(import.meta.url);
const BetterSqlite3 = require('better-sqlite3');

let db: Database.Database | null = null;

export function getDatabasePath(): string {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'reflective');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  return path.join(dbDir, 'database.db');
}

export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  const dbPath = getDatabasePath();
  console.log(`Initializing database at: ${dbPath}`);

  db = new BetterSqlite3(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
  }) as Database.Database;

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

  const statements = SCHEMA_SQL
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0);

  db.transaction(() => {
    for (const statement of statements) {
      db!.exec(statement);
    }
  })();

  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  if (currentVersion === 0) {
    db.pragma('user_version = 1');
    console.log('Database schema initialized (version 1)');
  } else {
    console.log(`Database schema version: ${currentVersion}`);
  }

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

process.on('exit', () => {
  closeDatabase();
});
