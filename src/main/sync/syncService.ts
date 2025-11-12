import type Database from 'better-sqlite3';
import type { SyncQueueItem } from '../../types/database';
import { getSetting, updateSettings, getSettings } from '../settings/settingsStore';
import { PrivacyTier } from '../../types/settings';
import { encrypt } from '../crypto/aesEncryption';
import { getKey } from '../crypto/keyManager';
import axios from 'axios';

let syncWorkerInterval: NodeJS.Timeout | null = null;
let isSyncing = false;
let db: Database.Database | null = null;

const SYNC_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;

export function initializeSyncService(database: Database.Database): void {
  db = database;
  console.log('Sync service initialized');
}

export interface SyncOperationPayload {
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  data?: Record<string, unknown>;
}

export function enqueueSyncOperation(payload: SyncOperationPayload): number {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const privacyTier = getSetting('privacyTier');
  if (privacyTier === PrivacyTier.LOCAL_ONLY) {
    console.log('Privacy tier is LOCAL_ONLY, skipping sync queue');
    return -1;
  }

  const stmt = db.prepare(`
    INSERT INTO sync_queue (operation, table_name, record_id, data, created_at, synced, retry_count, failed)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0)
  `);

  const result = stmt.run(
    payload.operation,
    payload.tableName,
    payload.recordId,
    payload.data ? JSON.stringify(payload.data) : null,
    Date.now()
  );

  console.log(`Enqueued sync operation: ${payload.operation} ${payload.tableName} #${payload.recordId}`);

  return result.lastInsertRowid as number;
}

export function getQueuedOperations(): SyncQueueItem[] {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const stmt = db.prepare(`
    SELECT * FROM sync_queue
    WHERE synced = 0 AND failed = 0
    ORDER BY created_at ASC
  `);

  return stmt.all() as SyncQueueItem[];
}

export function getSyncQueueStatus(): {
  pending: number;
  failed: number;
  total: number;
} {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const pendingStmt = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0 AND failed = 0');
  const failedStmt = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE failed = 1');
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE synced = 0');

  const pending = (pendingStmt.get() as { count: number }).count;
  const failed = (failedStmt.get() as { count: number }).count;
  const total = (totalStmt.get() as { count: number }).count;

  return { pending, failed, total };
}

export function clearSyncQueue(): void {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const stmt = db.prepare('DELETE FROM sync_queue WHERE synced = 1 OR failed = 1');
  const result = stmt.run();

  console.log(`Cleared ${result.changes} completed/failed operations from sync queue`);
}

async function uploadOperation(operation: SyncQueueItem): Promise<void> {
  const settings = getSettings();
  const backendUrl = settings.backendUrl || 'http://localhost:8000';
  const authToken = settings.authToken;
  const deviceId = settings.deviceId;

  if (!authToken) {
    throw new Error('AUTH_REQUIRED:No authentication token available');
  }

  if (operation.table_name !== 'entries') {
    console.log(`Skipping sync for non-entry table: ${operation.table_name}`);
    return;
  }

  const aesKey = await getKey('aes-key');
  if (!aesKey) {
    throw new Error('ENCRYPTION_KEY_MISSING:Encryption key not found');
  }

  const data = operation.data ? JSON.parse(operation.data as string) : {};

  if (operation.operation === 'DELETE') {
    await axios.delete(`${backendUrl}/api/sync/backup/${operation.record_id}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 30000,
    });
    console.log(`Successfully deleted entry ${operation.record_id} from backend`);
    return;
  }

  const content = data.content || '';
  const encrypted = encrypt(content, aesKey);

  const payload = {
    id: operation.record_id,
    encrypted_content: Buffer.from(encrypted.encrypted, 'hex').toString('base64'),
    content_iv: Buffer.from(encrypted.iv, 'hex').toString('base64'),
    content_tag: Buffer.from(encrypted.authTag, 'hex').toString('base64'),
    created_at: new Date(data.created_at || Date.now()).toISOString(),
    updated_at: new Date(data.updated_at || Date.now()).toISOString(),
    device_id: deviceId || 'unknown',
  };

  try {
    await axios.post(`${backendUrl}/api/sync/backup`, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 30000,
    });

    console.log(`Successfully uploaded ${operation.operation} for entry ${operation.record_id}`);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 409) {
        await handleConflict(operation.record_id, backendUrl, authToken);
        throw new Error('CONFLICT:Entry has been modified on server');
      }
      if (error.response?.status === 401) {
        throw new Error('AUTH_REQUIRED:Authentication token expired or invalid');
      }
      if (error.response?.status === 403) {
        throw new Error('PRIVACY_TIER:Privacy tier does not allow sync');
      }
      throw new Error(`HTTP_ERROR:${error.response?.status || 'Unknown'} - ${error.response?.data?.detail || error.message}`);
    }
    throw error;
  }
}

async function handleConflict(entryId: string, backendUrl: string, authToken: string): Promise<void> {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  try {
    console.log(`Fetching conflict details for entry ${entryId}`);

    const response = await axios.get(`${backendUrl}/api/sync/conflicts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      timeout: 30000,
    });

    const conflicts = response.data?.conflicts || [];
    const conflict = conflicts.find((c: any) => c.log_id === entryId);

    if (!conflict) {
      console.error(`Conflict detected but not found in backend response for entry ${entryId}`);
      return;
    }

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO conflicts (
        id, log_id,
        local_encrypted_content, local_iv, local_tag, local_updated_at, local_device_id,
        remote_encrypted_content, remote_iv, remote_tag, remote_updated_at, remote_device_id,
        detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      conflict.id,
      conflict.log_id,
      conflict.local_version.encrypted_content,
      conflict.local_version.iv,
      conflict.local_version.tag || null,
      new Date(conflict.local_version.updated_at).getTime(),
      conflict.local_version.device_id,
      conflict.remote_version.encrypted_content,
      conflict.remote_version.iv,
      conflict.remote_version.tag || null,
      new Date(conflict.remote_version.updated_at).getTime(),
      conflict.remote_version.device_id,
      new Date(conflict.detected_at).getTime()
    );

    console.log(`Conflict stored in local database: ${conflict.id}`);
  } catch (error) {
    console.error('Failed to handle conflict:', error);
  }
}

function markOperationSynced(operationId: number): void {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const stmt = db.prepare('UPDATE sync_queue SET synced = 1 WHERE id = ?');
  stmt.run(operationId);
}

function incrementRetryCount(operationId: number): number {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const stmt = db.prepare(`
    UPDATE sync_queue
    SET retry_count = retry_count + 1
    WHERE id = ?
  `);
  stmt.run(operationId);

  const getStmt = db.prepare('SELECT retry_count FROM sync_queue WHERE id = ?');
  const result = getStmt.get(operationId) as { retry_count: number };

  return result.retry_count;
}

function markOperationFailed(operationId: number): void {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  const stmt = db.prepare('UPDATE sync_queue SET failed = 1 WHERE id = ?');
  stmt.run(operationId);

  console.error(`Operation ${operationId} marked as failed after ${MAX_RETRIES} retries`);
}

export async function processQueue(): Promise<{
  processed: number;
  failed: number;
  errors: string[];
}> {
  if (!db) {
    throw new Error('Sync service not initialized');
  }

  if (isSyncing) {
    console.log('Sync already in progress, skipping...');
    return { processed: 0, failed: 0, errors: [] };
  }

  const privacyTier = getSetting('privacyTier');
  if (privacyTier === PrivacyTier.LOCAL_ONLY) {
    console.log('Privacy tier is LOCAL_ONLY, skipping sync');
    return { processed: 0, failed: 0, errors: [] };
  }

  isSyncing = true;
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const operations = getQueuedOperations();

    if (operations.length === 0) {
      console.log('No operations to sync');
      return { processed: 0, failed: 0, errors: [] };
    }

    console.log(`Processing ${operations.length} sync operations...`);

    for (const operation of operations) {
      try {
        const backoffMs = Math.pow(2, operation.retry_count) * 1000;
        if (backoffMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }

        await uploadOperation(operation);

        markOperationSynced(operation.id);
        processed++;

        console.log(`Successfully synced operation ${operation.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to sync operation ${operation.id}:`, errorMessage);

        const newRetryCount = incrementRetryCount(operation.id);

        if (newRetryCount >= MAX_RETRIES) {
          markOperationFailed(operation.id);
          failed++;
          errors.push(`Operation ${operation.id}: ${errorMessage}`);
        }
      }
    }

    updateSettings({ lastSyncTime: Date.now() });

    console.log(`Sync completed: ${processed} processed, ${failed} failed`);
  } finally {
    isSyncing = false;
  }

  return { processed, failed, errors };
}

async function syncWorkerTick(): Promise<void> {
  try {
    await processQueue();
  } catch (error) {
    console.error('Sync worker error:', error);
  }
}

export function startSyncWorker(): void {
  if (syncWorkerInterval) {
    console.log('Sync worker already running');
    return;
  }

  console.log(`Starting sync worker (interval: ${SYNC_INTERVAL_MS}ms)`);

  syncWorkerInterval = setInterval(syncWorkerTick, SYNC_INTERVAL_MS);

  void syncWorkerTick();
}

export function stopSyncWorker(): void {
  if (syncWorkerInterval) {
    clearInterval(syncWorkerInterval);
    syncWorkerInterval = null;
    console.log('Sync worker stopped');
  }
}

export function isSyncWorkerRunning(): boolean {
  return syncWorkerInterval !== null;
}
