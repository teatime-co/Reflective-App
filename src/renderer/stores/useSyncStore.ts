import { create } from 'zustand';
import type { SyncQueueItem } from '../../types/database';

interface SyncStatus {
  pending: number;
  failed: number;
  total: number;
}

interface SyncStore {
  syncQueue: SyncQueueItem[];
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
  pendingCount: number;
  failedCount: number;

  enqueueSyncOperation: (payload: {
    operation: 'CREATE' | 'UPDATE' | 'DELETE';
    tableName: string;
    recordId: number;
    data?: Record<string, unknown>;
  }) => Promise<number>;

  processQueue: () => Promise<{
    processed: number;
    failed: number;
    errors: string[];
  }>;

  fetchQueue: () => Promise<void>;
  getSyncStatus: () => Promise<void>;
  clearQueue: () => Promise<boolean>;
}

export const useSyncStore = create<SyncStore>((set, get) => ({
  syncQueue: [],
  isSyncing: false,
  lastSyncTime: null,
  error: null,
  pendingCount: 0,
  failedCount: 0,

  enqueueSyncOperation: async (payload) => {
    try {
      const result = await window.electronAPI.sync.enqueue(payload);

      if (result.success && result.data?.queueId) {
        await get().getSyncStatus();
        return result.data.queueId;
      } else {
        console.error('Failed to enqueue sync operation:', result.error);
        set({ error: result.error || 'Failed to enqueue operation' });
        return -1;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to enqueue sync operation:', errorMessage);
      set({ error: errorMessage });
      return -1;
    }
  },

  processQueue: async () => {
    set({ isSyncing: true, error: null });
    try {
      const result = await window.electronAPI.sync.processQueue();

      if (result.success && result.data) {
        const { processed = 0, failed = 0, errors = [] } = result.data;

        await get().getSyncStatus();

        set({
          isSyncing: false,
          lastSyncTime: Date.now(),
          error: errors.length > 0 ? errors[0] : null,
        });

        return { processed, failed, errors };
      } else {
        set({
          isSyncing: false,
          error: result.error || 'Failed to process queue',
        });
        return { processed: 0, failed: 0, errors: [result.error || 'Unknown error'] };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ isSyncing: false, error: errorMessage });
      return { processed: 0, failed: 0, errors: [errorMessage] };
    }
  },

  fetchQueue: async () => {
    try {
      const result = await window.electronAPI.sync.getQueue();

      if (result.success && result.data?.operations) {
        set({ syncQueue: result.data.operations, error: null });
      } else {
        set({ error: result.error || 'Failed to fetch queue' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    }
  },

  getSyncStatus: async () => {
    try {
      const result = await window.electronAPI.sync.getStatus();

      if (result.success && result.data?.status) {
        const { pending, failed, total } = result.data.status;
        set({
          pendingCount: pending,
          failedCount: failed,
          error: null,
        });
      } else {
        set({ error: result.error || 'Failed to get sync status' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
    }
  },

  clearQueue: async () => {
    try {
      const result = await window.electronAPI.sync.clearQueue();

      if (result.success) {
        await get().getSyncStatus();
        await get().fetchQueue();
        set({ error: null });
        return true;
      } else {
        set({ error: result.error || 'Failed to clear queue' });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ error: errorMessage });
      return false;
    }
  },
}));
