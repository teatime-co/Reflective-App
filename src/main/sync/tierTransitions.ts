import type Database from 'better-sqlite3';
import { PrivacyTier } from '../../types/settings';
import { encrypt } from '../crypto/aesEncryption';
import { getKey, generateAESKey, getKeyString, KEY_NAMES } from '../crypto/keyManager';
import { enqueueSyncOperation } from './syncService';
import * as heEncryption from '../crypto/heEncryption';
import { getSettings } from '../settings/settingsStore';
import axios from 'axios';

let db: Database.Database | null = null;

export function initializeTierTransitions(database: Database.Database): void {
  db = database;
}

export interface TierTransitionResult {
  success: boolean;
  processed?: number;
  error?: string;
}

export interface TierTransitionProgress {
  current: number;
  total: number;
  operation: string;
}

export async function handleTierChange(
  oldTier: PrivacyTier,
  newTier: PrivacyTier,
  backendUrl: string,
  authToken: string | null,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  console.log(`Tier transition: ${oldTier} -> ${newTier}`);

  if (oldTier === newTier) {
    return { success: true, processed: 0 };
  }

  const isUpgrade = getTierLevel(newTier) > getTierLevel(oldTier);

  if (isUpgrade) {
    return handleTierUpgrade(oldTier, newTier, backendUrl, authToken, progressCallback);
  } else {
    return handleTierDowngrade(oldTier, newTier, backendUrl, authToken, progressCallback);
  }
}

function getTierLevel(tier: PrivacyTier): number {
  switch (tier) {
    case PrivacyTier.LOCAL_ONLY:
      return 0;
    case PrivacyTier.ANALYTICS_SYNC:
      return 1;
    case PrivacyTier.FULL_SYNC:
      return 2;
    default:
      return 0;
  }
}

async function handleTierUpgrade(
  oldTier: PrivacyTier,
  newTier: PrivacyTier,
  backendUrl: string,
  authToken: string | null,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  try {
    let hePublicKey: string | null = null;

    if (newTier === PrivacyTier.ANALYTICS_SYNC || newTier === PrivacyTier.FULL_SYNC) {
      hePublicKey = await getKeyString(KEY_NAMES.HE_PUBLIC);
      if (!hePublicKey) {
        console.warn('[TierTransition] HE public key not found, will send null to backend');
      }
    }

    if (authToken) {
      progressCallback?.({ current: 0, total: 1, operation: 'Syncing privacy tier with backend' });

      console.log(`[TierTransition] Updating privacy tier to ${newTier} on backend`);

      try {
        const payload = {
          privacy_tier: newTier,
          consent_timestamp: new Date().toISOString(),
          he_public_key: hePublicKey,
        };

        await axios.put(`${backendUrl}/api/users/me/privacy`, payload, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          timeout: 10000,
        });

        console.log('[TierTransition] Backend privacy tier updated successfully');
      } catch (error) {
        console.error('[TierTransition] Failed to update backend privacy tier:', error);

        if (axios.isAxiosError(error)) {
          const detail = error.response?.data?.detail;
          const statusCode = error.response?.status;
          return {
            success: false,
            error: `Failed to update backend privacy tier: ${detail || statusCode || 'Network error'}. Please ensure the backend is running and try again.`,
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error updating backend',
        };
      }
    } else {
      console.warn('[TierTransition] No auth token, skipping backend privacy tier update');
    }

    if (newTier === PrivacyTier.FULL_SYNC) {
      if (!authToken) {
        return { success: false, error: 'Authentication token required for full sync' };
      }

      console.log('[TierTransition] Starting FULL_SYNC upgrade');

      let metricsProcessed = 0;

      if (oldTier === PrivacyTier.ANALYTICS_SYNC) {
        console.log('[TierTransition] Skipping metrics upload - already synced from analytics_sync tier');
      } else {
        console.log('[TierTransition] Uploading metrics...');
        const metricsResult = await bulkEncryptAndUploadMetrics(backendUrl, authToken, progressCallback);
        if (!metricsResult.success) {
          return metricsResult;
        }
        metricsProcessed = metricsResult.processed || 0;
        console.log('[TierTransition] Metrics uploaded successfully');
      }

      console.log('[TierTransition] Now uploading content...');

      const aesKey = await getKey('aes-key');
      if (!aesKey) {
        return {
          success: false,
          error: 'AES encryption key not found. Please generate keys first.'
        };
      }

      const contentResult = await bulkEncryptAndUploadEntries(backendUrl, authToken, aesKey, progressCallback);
      return {
        success: contentResult.success,
        processed: metricsProcessed + (contentResult.processed || 0),
        error: contentResult.error
      };
    }

    if (newTier === PrivacyTier.ANALYTICS_SYNC) {
      if (!authToken) {
        return { success: false, error: 'Authentication token required for analytics sync' };
      }

      console.log('[TierTransition] Starting ANALYTICS_SYNC upgrade: encrypting and uploading metrics');

      const metricsResult = await bulkEncryptAndUploadMetrics(backendUrl, authToken, progressCallback);
      return metricsResult;
    }

    return { success: true, processed: 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during upgrade'
    };
  }
}

async function handleTierDowngrade(
  oldTier: PrivacyTier,
  newTier: PrivacyTier,
  backendUrl: string,
  authToken: string | null,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  if (!authToken) {
    console.log('No auth token, skipping server deletion');
    return clearLocalSyncQueue();
  }

  try {
    if (oldTier === PrivacyTier.FULL_SYNC && newTier === PrivacyTier.ANALYTICS_SYNC) {
      progressCallback?.({ current: 0, total: 1, operation: 'Deleting encrypted content from server' });
      await deleteServerContent(backendUrl, authToken);
      await clearContentSyncQueue();
      return { success: true, processed: 1 };
    }

    if (oldTier === PrivacyTier.FULL_SYNC && newTier === PrivacyTier.LOCAL_ONLY) {
      progressCallback?.({ current: 0, total: 1, operation: 'Deleting all data from server' });
      await deleteAllServerData(backendUrl, authToken);
      await clearLocalSyncQueue();
      return { success: true, processed: 1 };
    }

    if (oldTier === PrivacyTier.ANALYTICS_SYNC && newTier === PrivacyTier.LOCAL_ONLY) {
      progressCallback?.({ current: 0, total: 1, operation: 'Deleting analytics from server' });
      await deleteServerMetrics(backendUrl, authToken);
      await clearLocalSyncQueue();
      return { success: true, processed: 1 };
    }

    return { success: true, processed: 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during downgrade'
    };
  }
}

async function bulkEncryptAndQueueEntries(
  aesKey: Buffer,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const stmt = db.prepare('SELECT id, content, word_count, sentiment_score, created_at, updated_at, device_id FROM entries');
  const entries = stmt.all() as Array<{
    id: string;
    content: string;
    word_count: number;
    sentiment_score: number;
    created_at: number;
    updated_at: number;
    device_id: string | null;
  }>;

  if (entries.length === 0) {
    return { success: true, processed: 0 };
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      progressCallback?.({
        current: processed + failed + 1,
        total: entries.length,
        operation: 'Encrypting and queuing entries'
      });

      console.log(`[TierTransition] Processing entry ${entry.id} (${processed + 1}/${entries.length})`);

      const encrypted = encrypt(entry.content, aesKey);
      console.log(`[TierTransition] Encrypted entry ${entry.id}`);

      const queueId = enqueueSyncOperation({
        operation: 'CREATE',
        tableName: 'entries',
        recordId: entry.id,
        data: {
          content: entry.content,
          word_count: entry.word_count,
          sentiment_score: entry.sentiment_score,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          device_id: entry.device_id,
          encrypted_content: encrypted.encrypted,
          content_iv: encrypted.iv,
          content_tag: encrypted.authTag
        }
      });

      console.log(`[TierTransition] Queued entry ${entry.id} with queue ID: ${queueId}`);
      processed++;
    } catch (error) {
      failed++;
      const errorMsg = `Entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TierTransition] ERROR: ${errorMsg}`);
      console.error(`[TierTransition] Stack:`, error instanceof Error ? error.stack : error);
      errors.push(errorMsg);
    }
  }

  console.log(`Encrypted and queued ${processed} entries for sync (${failed} failed)`);

  if (failed > 0) {
    console.error(`Failed entries:`, errors);
  }

  return { success: failed === 0, processed, error: errors.length > 0 ? errors.join('; ') : undefined };
}

async function bulkEncryptAndUploadEntries(
  backendUrl: string,
  authToken: string,
  aesKey: Buffer,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const settings = getSettings();
  const deviceId = settings.deviceId || 'unknown';

  const stmt = db.prepare('SELECT id, content, word_count, sentiment_score, created_at, updated_at, device_id FROM entries');
  const entries = stmt.all() as Array<{
    id: string;
    content: string;
    word_count: number;
    sentiment_score: number;
    created_at: number;
    updated_at: number;
    device_id: string | null;
  }>;

  if (entries.length === 0) {
    return { success: true, processed: 0 };
  }

  console.log(`[TierTransition] Uploading ${entries.length} encrypted entries...`);

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const entry of entries) {
    try {
      progressCallback?.({
        current: processed + failed + 1,
        total: entries.length,
        operation: `Uploading entry ${processed + failed + 1}/${entries.length}`
      });

      console.log(`[TierTransition] Encrypting and uploading entry ${entry.id} (${processed + 1}/${entries.length})`);

      const encrypted = encrypt(entry.content, aesKey);

      const payload = {
        id: entry.id,
        encrypted_content: Buffer.from(encrypted.encrypted, 'hex').toString('base64'),
        content_iv: Buffer.from(encrypted.iv, 'hex').toString('base64'),
        content_tag: Buffer.from(encrypted.authTag, 'hex').toString('base64'),
        created_at: new Date(entry.created_at).toISOString(),
        updated_at: new Date(entry.updated_at).toISOString(),
        device_id: entry.device_id || deviceId,
      };

      await axios.post(`${backendUrl}/api/sync/backup`, payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        timeout: 30000,
      });

      console.log(`[TierTransition] Successfully uploaded entry ${entry.id}`);
      processed++;
    } catch (error) {
      failed++;
      const errorMsg = `Entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TierTransition] ERROR uploading entry: ${errorMsg}`);

      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.detail || error.message;
        const status = error.response?.status;
        console.error(`[TierTransition] HTTP ${status}: ${detail}`);
        errors.push(`${errorMsg} (HTTP ${status})`);
      } else {
        console.error(`[TierTransition] Stack:`, error instanceof Error ? error.stack : error);
        errors.push(errorMsg);
      }
    }
  }

  console.log(`[TierTransition] Uploaded ${processed} entries (${failed} failed)`);

  if (failed > 0) {
    console.error(`[TierTransition] Failed entries:`, errors);
  }

  return { success: failed === 0, processed, error: errors.length > 0 ? errors.join('; ') : undefined };
}

async function bulkEncryptAndUploadMetrics(
  backendUrl: string,
  authToken: string,
  progressCallback?: (progress: TierTransitionProgress) => void
): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const stmt = db.prepare('SELECT id, word_count, sentiment_score FROM entries');
  const entries = stmt.all() as Array<{
    id: string;
    word_count: number;
    sentiment_score: number;
  }>;

  if (entries.length === 0) {
    return { success: true, processed: 0 };
  }

  console.log(`[TierTransition] Encrypting metrics for ${entries.length} entries...`);

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const heContextData = await heEncryption.fetchHEContext(backendUrl);
    await heEncryption.initializeContext(heContextData);
    const heKeysLoaded = await heEncryption.loadHEKeys();

    if (!heKeysLoaded) {
      return { success: false, error: 'HE keys not found. Please generate HE keys first.' };
    }

    const encryptedMetrics: Array<{
      log_id: string;
      metric_type: string;
      encrypted_value: string;
      timestamp: string;
    }> = [];

    for (const entry of entries) {
      try {
        progressCallback?.({
          current: processed + failed + 1,
          total: entries.length,
          operation: 'Encrypting metrics'
        });

        console.log(`[TierTransition] Encrypting metrics for entry ${entry.id} (${processed + 1}/${entries.length})`);

        const wordCountMetric = await heEncryption.createEncryptedMetric('word_count', entry.word_count);
        const sentimentMetric = await heEncryption.createEncryptedMetric('sentiment_score', entry.sentiment_score);

        encryptedMetrics.push({
          log_id: entry.id,
          metric_type: wordCountMetric.metric_type,
          encrypted_value: Buffer.from(wordCountMetric.encrypted_value).toString('base64'),
          timestamp: wordCountMetric.timestamp.toISOString()
        });

        encryptedMetrics.push({
          log_id: entry.id,
          metric_type: sentimentMetric.metric_type,
          encrypted_value: Buffer.from(sentimentMetric.encrypted_value).toString('base64'),
          timestamp: sentimentMetric.timestamp.toISOString()
        });

        processed++;
      } catch (error) {
        failed++;
        const errorMsg = `Entry ${entry.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[TierTransition] ERROR encrypting metrics: ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    if (encryptedMetrics.length > 0) {
      console.log(`[TierTransition] Uploading ${encryptedMetrics.length} encrypted metrics to backend...`);

      try {
        await axios.post(`${backendUrl}/api/encryption/metrics`,
          { metrics: encryptedMetrics },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`
            },
            timeout: 30000
          }
        );

        console.log(`[TierTransition] Successfully uploaded encrypted metrics`);
      } catch (error) {
        console.error('[TierTransition] Failed to upload metrics:', error);
        if (axios.isAxiosError(error)) {
          return {
            success: false,
            error: `Failed to upload metrics: ${error.response?.data?.detail || error.message}`
          };
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error uploading metrics'
        };
      }
    }

    console.log(`Encrypted and uploaded metrics for ${processed} entries (${failed} failed)`);

    if (failed > 0) {
      console.error(`Failed entries:`, errors);
    }

    return { success: failed === 0, processed, error: errors.length > 0 ? errors.join('; ') : undefined };
  } catch (error) {
    console.error('[TierTransition] Error during metric encryption:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during metric encryption'
    };
  }
}

async function deleteAllServerData(backendUrl: string, authToken: string): Promise<void> {
  try {
    await axios.delete(`${backendUrl}/api/users/me/privacy/revoke`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 30000
    });
    console.log('Successfully deleted all server data');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log('No server data to delete (404)');
        return;
      }
      throw new Error(`Failed to delete server data: ${error.response?.status || 'Network error'}`);
    }
    throw error;
  }
}

async function deleteServerContent(backendUrl: string, authToken: string): Promise<void> {
  try {
    await axios.delete(`${backendUrl}/api/sync/backup/content`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 30000
    });
    console.log('Successfully deleted encrypted content from server');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log('No server content to delete (404)');
        return;
      }
      throw new Error(`Failed to delete server content: ${error.response?.status || 'Network error'}`);
    }
    throw error;
  }
}

async function deleteServerMetrics(backendUrl: string, authToken: string): Promise<void> {
  try {
    await axios.delete(`${backendUrl}/api/sync/metrics/all`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      timeout: 30000
    });
    console.log('Successfully deleted analytics from server');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log('No server metrics to delete (404)');
        return;
      }
      throw new Error(`Failed to delete server metrics: ${error.response?.status || 'Network error'}`);
    }
    throw error;
  }
}

async function clearLocalSyncQueue(): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const stmt = db.prepare('DELETE FROM sync_queue');
  const result = stmt.run();

  console.log(`Cleared ${result.changes} operations from sync queue`);
  return { success: true, processed: result.changes };
}

async function clearContentSyncQueue(): Promise<TierTransitionResult> {
  if (!db) {
    return { success: false, error: 'Database not initialized' };
  }

  const stmt = db.prepare("DELETE FROM sync_queue WHERE table_name = 'entries'");
  const result = stmt.run();

  console.log(`Cleared ${result.changes} content operations from sync queue`);
  return { success: true, processed: result.changes };
}
