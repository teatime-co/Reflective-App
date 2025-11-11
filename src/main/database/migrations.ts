import type Database from 'better-sqlite3';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      console.log('Migration 1: Initial schema already applied via schema.sql');
    },
  },
  {
    version: 2,
    name: 'add_encryption_columns',
    up: (db) => {
      console.log('Migration 2: Adding encryption columns to entries table');

      db.exec(`
        ALTER TABLE entries ADD COLUMN encrypted_content BLOB;
      `);

      db.exec(`
        ALTER TABLE entries ADD COLUMN encrypted_metadata BLOB;
      `);

      db.exec(`
        ALTER TABLE entries ADD COLUMN encryption_version INTEGER DEFAULT 1;
      `);

      console.log('Encryption columns added successfully');
    },
  },
  {
    version: 3,
    name: 'add_sync_queue_retry_columns',
    up: (db) => {
      console.log('Migration 3: Adding retry_count and failed columns to sync_queue table');

      db.exec(`
        ALTER TABLE sync_queue ADD COLUMN retry_count INTEGER DEFAULT 0;
      `);

      db.exec(`
        ALTER TABLE sync_queue ADD COLUMN failed INTEGER DEFAULT 0;
      `);

      console.log('Sync queue retry columns added successfully');
    },
  },
];

export function runMigrations(db: Database.Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  console.log(`Current database version: ${currentVersion}`);

  const pendingMigrations = migrations.filter((m) => m.version > currentVersion);

  if (pendingMigrations.length === 0) {
    console.log('Database is up to date');
    return;
  }

  console.log(`Running ${pendingMigrations.length} migration(s)...`);

  db.transaction(() => {
    for (const migration of pendingMigrations) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      migration.up(db);
      db.pragma(`user_version = ${migration.version}`);
    }
  })();

  console.log('All migrations completed successfully');
}

export function getCurrentVersion(db: Database.Database): number {
  return db.pragma('user_version', { simple: true }) as number;
}

export function getLatestVersion(): number {
  if (migrations.length === 0) {
    return 0;
  }
  return Math.max(...migrations.map((m) => m.version));
}
