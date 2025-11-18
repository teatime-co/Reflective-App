export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    embedding BLOB,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    word_count INTEGER DEFAULT 0,
    sentiment_score REAL DEFAULT 0.0,
    device_id TEXT,
    synced_at INTEGER,
    encrypted_content BLOB,
    encrypted_metadata BLOB,
    encryption_version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_updated_at ON entries(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_entries_synced_at ON entries(synced_at);
CREATE INDEX IF NOT EXISTS idx_entries_has_embedding ON entries(id) WHERE embedding IS NOT NULL;

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3b82f6',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    usage_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

CREATE TABLE IF NOT EXISTS entry_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(entry_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_id ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON entry_tags(tag_id);

CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    theme_name TEXT NOT NULL,
    confidence REAL NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_themes_entry_id ON themes(entry_id);
CREATE INDEX IF NOT EXISTS idx_themes_confidence ON themes(confidence DESC);

CREATE TABLE IF NOT EXISTS sync_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    synced INTEGER DEFAULT 0,
    retry_count INTEGER DEFAULT 0,
    failed INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_synced ON sync_queue(synced, created_at);

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
);

CREATE INDEX IF NOT EXISTS idx_conflicts_log_id ON conflicts(log_id);
CREATE INDEX IF NOT EXISTS idx_conflicts_detected_at ON conflicts(detected_at DESC);

CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_date INTEGER NOT NULL,
    end_date INTEGER NOT NULL,
    days_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_streaks_end_date ON streaks(end_date DESC);
CREATE INDEX IF NOT EXISTS idx_streaks_days_count ON streaks(days_count DESC);
`;
