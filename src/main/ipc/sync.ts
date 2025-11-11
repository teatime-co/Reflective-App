import { ipcMain } from 'electron';
import type { SyncQueueItem } from '../../types/database';
import {
  enqueueSyncOperation,
  processQueue,
  getQueuedOperations,
  getSyncQueueStatus,
  clearSyncQueue,
  type SyncOperationPayload,
} from '../sync/syncService';

export interface SyncResult {
  success: boolean;
  data?: {
    processed?: number;
    failed?: number;
    errors?: string[];
    queueId?: number;
    operations?: SyncQueueItem[];
    status?: {
      pending: number;
      failed: number;
      total: number;
    };
  };
  error?: string;
}

export function registerSyncHandlers(): void {
  ipcMain.handle(
    'sync:enqueue',
    async (_event, payload: SyncOperationPayload): Promise<SyncResult> => {
      try {
        const queueId = enqueueSyncOperation(payload);
        return {
          success: true,
          data: { queueId },
        };
      } catch (error) {
        console.error('Failed to enqueue sync operation:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
  );

  ipcMain.handle('sync:processQueue', async (): Promise<SyncResult> => {
    try {
      const result = await processQueue();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('sync:getQueue', async (): Promise<SyncResult> => {
    try {
      const operations = getQueuedOperations();
      return {
        success: true,
        data: { operations },
      };
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('sync:getStatus', async (): Promise<SyncResult> => {
    try {
      const status = getSyncQueueStatus();
      return {
        success: true,
        data: { status },
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  ipcMain.handle('sync:clearQueue', async (): Promise<SyncResult> => {
    try {
      clearSyncQueue();
      return {
        success: true,
      };
    } catch (error) {
      console.error('Failed to clear sync queue:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
