import { create } from 'zustand';
import type { Entry, NewEntry, UpdateEntry } from '../../types/database';

interface EntriesState {
  entries: Entry[];
  currentEntry: Entry | null;
  isLoading: boolean;
  error: string | null;

  loadEntries: () => Promise<void>;
  getEntry: (id: number) => Promise<void>;
  createEntry: (entry: NewEntry) => Promise<Entry | null>;
  updateEntry: (id: number, updates: UpdateEntry) => Promise<boolean>;
  deleteEntry: (id: number) => Promise<boolean>;
  setCurrentEntry: (entry: Entry | null) => void;
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  currentEntry: null,
  isLoading: false,
  error: null,

  loadEntries: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.query<Entry[]>(
        'SELECT * FROM entries ORDER BY created_at DESC'
      );

      if (result.success && result.data) {
        set({ entries: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to load entries', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  getEntry: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.query<Entry[]>(
        'SELECT * FROM entries WHERE id = ?',
        [id]
      );

      if (result.success && result.data && result.data.length > 0) {
        set({ currentEntry: result.data[0], isLoading: false });
      } else {
        set({ error: 'Entry not found', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  createEntry: async (entry: NewEntry) => {
    set({ isLoading: true, error: null });
    try {
      const now = Date.now();
      const result = await window.electronAPI.db.run(
        `INSERT INTO entries (content, word_count, sentiment_score, created_at, updated_at, device_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entry.content,
          entry.word_count || 0,
          entry.sentiment_score || 0,
          now,
          now,
          entry.device_id || null
        ]
      );

      if (result.success && result.lastInsertRowid) {
        const newEntryResult = await window.electronAPI.db.query<Entry[]>(
          'SELECT * FROM entries WHERE id = ?',
          [result.lastInsertRowid]
        );

        if (newEntryResult.success && newEntryResult.data && newEntryResult.data.length > 0) {
          const newEntry = newEntryResult.data[0];
          set((state) => ({
            entries: [newEntry, ...state.entries],
            currentEntry: newEntry,
            isLoading: false
          }));
          return newEntry;
        }
      }

      set({ error: result.error || 'Failed to create entry', isLoading: false });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return null;
    }
  },

  updateEntry: async (id: number, updates: UpdateEntry) => {
    set({ isLoading: true, error: null });
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.content !== undefined) {
        setParts.push('content = ?');
        values.push(updates.content);
      }
      if (updates.word_count !== undefined) {
        setParts.push('word_count = ?');
        values.push(updates.word_count);
      }
      if (updates.sentiment_score !== undefined) {
        setParts.push('sentiment_score = ?');
        values.push(updates.sentiment_score);
      }
      if (updates.embedding !== undefined) {
        setParts.push('embedding = ?');
        values.push(updates.embedding);
      }

      setParts.push('updated_at = ?');
      values.push(Date.now());
      values.push(id);

      const result = await window.electronAPI.db.run(
        `UPDATE entries SET ${setParts.join(', ')} WHERE id = ?`,
        values
      );

      if (result.success) {
        await get().loadEntries();
        if (get().currentEntry?.id === id) {
          await get().getEntry(id);
        }
        set({ isLoading: false });
        return true;
      }

      set({ error: result.error || 'Failed to update entry', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  },

  deleteEntry: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.run(
        'DELETE FROM entries WHERE id = ?',
        [id]
      );

      if (result.success) {
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
          currentEntry: state.currentEntry?.id === id ? null : state.currentEntry,
          isLoading: false
        }));
        return true;
      }

      set({ error: result.error || 'Failed to delete entry', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  },

  setCurrentEntry: (entry: Entry | null) => {
    set({ currentEntry: entry });
  }
}));
