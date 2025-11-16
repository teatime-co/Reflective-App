import type Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (_db) => {
      console.log('Migration 1: Initial schema already applied via schema.ts');
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
  {
    version: 4,
    name: 'migrate_entries_to_uuid',
    up: (db) => {
      console.log('Migration 4: Converting entry IDs from INTEGER to UUID');

      const entries = db.prepare('SELECT * FROM entries').all() as Array<{
        id: number;
        content: string;
        embedding: Buffer | null;
        created_at: number;
        updated_at: number;
        word_count: number;
        sentiment_score: number;
        device_id: string | null;
        synced_at: number | null;
        encrypted_content: Buffer | null;
        encrypted_metadata: Buffer | null;
        encryption_version: number | null;
      }>;

      const entryTags = db.prepare('SELECT * FROM entry_tags').all() as Array<{
        id: number;
        entry_id: number;
        tag_id: number;
        created_at: number;
      }>;

      const themes = db.prepare('SELECT * FROM themes').all() as Array<{
        id: number;
        entry_id: number;
        theme_name: string;
        confidence: number;
        created_at: number;
      }>;

      const syncQueue = db.prepare('SELECT * FROM sync_queue').all() as Array<{
        id: number;
        operation: string;
        table_name: string;
        record_id: number;
        data: string | null;
        created_at: number;
        synced: number;
        retry_count: number;
        failed: number;
      }>;

      console.log(`Found ${entries.length} entries to migrate`);

      db.exec('DROP TABLE IF EXISTS entries_new');
      db.exec('DROP TABLE IF EXISTS entry_tags_new');
      db.exec('DROP TABLE IF EXISTS themes_new');
      db.exec('DROP TABLE IF EXISTS sync_queue_new');

      db.exec(`
        CREATE TABLE entries_new (
          id TEXT PRIMARY KEY,
          content TEXT NOT NULL,
          embedding BLOB,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          word_count INTEGER DEFAULT 0,
          sentiment_score REAL DEFAULT 0.0,
          device_id TEXT,
          synced_at INTEGER,
          encrypted_content BLOB,
          encrypted_metadata BLOB,
          encryption_version INTEGER DEFAULT 1
        )
      `);

      db.exec(`
        CREATE TABLE entry_tags_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_id TEXT NOT NULL,
          tag_id INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (entry_id) REFERENCES entries_new(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
          UNIQUE(entry_id, tag_id)
        )
      `);

      db.exec(`
        CREATE TABLE themes_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_id TEXT NOT NULL,
          theme_name TEXT NOT NULL,
          confidence REAL NOT NULL,
          created_at INTEGER NOT NULL,
          FOREIGN KEY (entry_id) REFERENCES entries_new(id) ON DELETE CASCADE
        )
      `);

      db.exec(`
        CREATE TABLE sync_queue_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT,
          created_at INTEGER NOT NULL,
          synced INTEGER DEFAULT 0,
          retry_count INTEGER DEFAULT 0,
          failed INTEGER DEFAULT 0
        )
      `);

      const idMap = new Map<number, string>();

      for (const entry of entries) {
        const uuid = randomUUID();
        idMap.set(entry.id, uuid);

        db.prepare(`
          INSERT INTO entries_new (
            id, content, embedding, created_at, updated_at, word_count,
            sentiment_score, device_id, synced_at, encrypted_content,
            encrypted_metadata, encryption_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          uuid,
          entry.content,
          entry.embedding,
          entry.created_at,
          entry.updated_at,
          entry.word_count,
          entry.sentiment_score,
          entry.device_id,
          entry.synced_at,
          entry.encrypted_content,
          entry.encrypted_metadata,
          entry.encryption_version
        );
      }

      for (const entryTag of entryTags) {
        const uuid = idMap.get(entryTag.entry_id);
        if (uuid) {
          db.prepare(`
            INSERT INTO entry_tags_new (entry_id, tag_id, created_at)
            VALUES (?, ?, ?)
          `).run(uuid, entryTag.tag_id, entryTag.created_at);
        }
      }

      for (const theme of themes) {
        const uuid = idMap.get(theme.entry_id);
        if (uuid) {
          db.prepare(`
            INSERT INTO themes_new (entry_id, theme_name, confidence, created_at)
            VALUES (?, ?, ?, ?)
          `).run(uuid, theme.theme_name, theme.confidence, theme.created_at);
        }
      }

      for (const item of syncQueue) {
        const uuid = idMap.get(item.record_id);
        if (uuid) {
          db.prepare(`
            INSERT INTO sync_queue_new (operation, table_name, record_id, data, created_at, synced, retry_count, failed)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            item.operation,
            item.table_name,
            uuid,
            item.data,
            item.created_at,
            item.synced,
            item.retry_count,
            item.failed
          );
        }
      }

      db.exec('DROP TABLE entries');
      db.exec('DROP TABLE entry_tags');
      db.exec('DROP TABLE themes');
      db.exec('DROP TABLE sync_queue');

      db.exec('ALTER TABLE entries_new RENAME TO entries');
      db.exec('ALTER TABLE entry_tags_new RENAME TO entry_tags');
      db.exec('ALTER TABLE themes_new RENAME TO themes');
      db.exec('ALTER TABLE sync_queue_new RENAME TO sync_queue');

      db.exec('CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_entries_synced_at ON entries(synced_at)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_id ON entry_tags(entry_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_themes_entry_id ON themes(entry_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_themes_confidence ON themes(confidence DESC)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced, created_at)');

      console.log('Entry IDs successfully migrated to UUIDs');
    },
  },
  {
    version: 5,
    name: 'add_conflicts_table',
    up: (db) => {
      console.log('Migration 5: Creating conflicts table for sync conflict resolution');

      db.exec(`
        CREATE TABLE IF NOT EXISTS conflicts (
          id TEXT PRIMARY KEY,
          log_id TEXT NOT NULL,
          local_encrypted_content TEXT NOT NULL,
          local_iv TEXT NOT NULL,
          local_tag TEXT,
          local_updated_at INTEGER NOT NULL,
          local_device_id TEXT NOT NULL,
          remote_encrypted_content TEXT NOT NULL,
          remote_iv TEXT NOT NULL,
          remote_tag TEXT,
          remote_updated_at INTEGER NOT NULL,
          remote_device_id TEXT NOT NULL,
          detected_at INTEGER NOT NULL,
          FOREIGN KEY (log_id) REFERENCES entries(id) ON DELETE CASCADE
        )
      `);

      db.exec('CREATE INDEX IF NOT EXISTS idx_conflicts_log_id ON conflicts(log_id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_conflicts_detected_at ON conflicts(detected_at DESC)');

      console.log('Conflicts table created successfully');
    },
  },
  {
    version: 6,
    name: 'add_embedding_partial_index',
    up: (db) => {
      console.log('Migration 6: Adding partial index for embedding existence checks');

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_entries_has_embedding
        ON entries(id) WHERE embedding IS NOT NULL
      `);

      console.log('Embedding partial index created successfully');
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
