import { create } from 'zustand';
import type { LocalConflict, DecryptedConflict, ConflictResolution } from '../../types/conflicts';

interface ConflictsStore {
  conflicts: LocalConflict[];
  decryptedConflicts: Map<string, DecryptedConflict>;
  selectedConflict: LocalConflict | null;
  isLoading: boolean;
  error: string | null;

  fetchConflicts: () => Promise<void>;
  fetchConflictsFromBackend: () => Promise<void>;
  selectConflict: (conflictId: string) => void;
  resolveConflict: (
    conflictId: string,
    resolution: ConflictResolution,
    mergedContent?: string
  ) => Promise<boolean>;
  getConflictCount: () => Promise<number>;
  deleteConflict: (conflictId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useConflictsStore = create<ConflictsStore>((set, get) => ({
  conflicts: [],
  decryptedConflicts: new Map(),
  selectedConflict: null,
  isLoading: false,
  error: null,

  fetchConflicts: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.conflicts.fetch();

      if (result.success && result.data?.conflicts) {
        set({
          conflicts: result.data.conflicts,
          isLoading: false,
        });
      } else {
        console.error('Failed to fetch conflicts:', result.error);
        set({
          error: result.error || 'Failed to fetch conflicts',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch conflicts:', errorMessage);
      set({ error: errorMessage, isLoading: false });
    }
  },

  fetchConflictsFromBackend: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.conflicts.fetchFromBackend();

      if (result.success && result.data?.conflicts) {
        set({
          conflicts: result.data.conflicts,
          isLoading: false,
        });
      } else {
        console.error('Failed to fetch conflicts from backend:', result.error);
        set({
          error: result.error || 'Failed to fetch conflicts from backend',
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch conflicts from backend:', errorMessage);
      set({ error: errorMessage, isLoading: false });
    }
  },

  selectConflict: (conflictId: string) => {
    const { conflicts } = get();
    const conflict = conflicts.find((c) => c.id === conflictId);
    set({ selectedConflict: conflict || null });
  },

  resolveConflict: async (
    conflictId: string,
    resolution: ConflictResolution,
    mergedContent?: string
  ) => {
    set({ isLoading: true, error: null });
    try {
      let mergedData: {
        encryptedContent: string;
        iv: string;
        tag: string;
      } | undefined;

      if (resolution === 'merged' && mergedContent) {
        const encryptResult = await window.electronAPI.crypto.aes.encrypt(mergedContent);
        if (!encryptResult.success || !encryptResult.data) {
          throw new Error('Failed to encrypt merged content');
        }
        mergedData = {
          encryptedContent: encryptResult.data.encrypted,
          iv: encryptResult.data.iv,
          tag: encryptResult.data.authTag,
        };
      }

      const result = await window.electronAPI.conflicts.resolve(
        conflictId,
        resolution,
        mergedData
      );

      if (result.success) {
        const { conflicts } = get();
        set({
          conflicts: conflicts.filter((c) => c.id !== conflictId),
          selectedConflict: null,
          isLoading: false,
        });
        return true;
      } else {
        console.error('Failed to resolve conflict:', result.error);
        set({
          error: result.error || 'Failed to resolve conflict',
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to resolve conflict:', errorMessage);
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  getConflictCount: async () => {
    try {
      const result = await window.electronAPI.conflicts.getCount();

      if (result.success && result.data?.count !== undefined) {
        return result.data.count;
      } else {
        console.error('Failed to get conflict count:', result.error);
        return 0;
      }
    } catch (error) {
      console.error('Failed to get conflict count:', error);
      return 0;
    }
  },

  deleteConflict: async (conflictId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.conflicts.delete(conflictId);

      if (result.success) {
        const { conflicts } = get();
        set({
          conflicts: conflicts.filter((c) => c.id !== conflictId),
          isLoading: false,
        });
        return true;
      } else {
        console.error('Failed to delete conflict:', result.error);
        set({
          error: result.error || 'Failed to delete conflict',
          isLoading: false,
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to delete conflict:', errorMessage);
      set({ error: errorMessage, isLoading: false });
      return false;
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
