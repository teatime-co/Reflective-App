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
