export interface Entry {
  id: number;
  content: string;
  embedding: Buffer | null;
  created_at: number;
  updated_at: number;
  word_count: number;
  sentiment_score: number;
  device_id: string | null;
  synced_at: number | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: number;
  usage_count: number;
}

export interface EntryTag {
  id: number;
  entry_id: number;
  tag_id: number;
  created_at: number;
}

export interface Theme {
  id: number;
  entry_id: number;
  theme_name: string;
  confidence: number;
  created_at: number;
}

export interface SyncQueueItem {
  id: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: number;
  data: string | null;
  created_at: number;
  synced: number;
  retry_count: number;
  failed: number;
}

export interface NewEntry {
  content: string;
  embedding?: Uint8Array | Buffer;
  word_count?: number;
  sentiment_score?: number;
  device_id?: string;
}

export interface UpdateEntry {
  content?: string;
  embedding?: Uint8Array | Buffer;
  word_count?: number;
  sentiment_score?: number;
  updated_at?: number;
}

export interface NewTag {
  name: string;
  color?: string;
}

export interface NewTheme {
  entry_id: number;
  theme_name: string;
  confidence: number;
}

export interface DatabaseStats {
  totalEntries: number;
  totalTags: number;
  totalThemes: number;
  databaseSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RunResult {
  success: boolean;
  changes?: number;
  lastInsertRowid?: number;
  error?: string;
}
