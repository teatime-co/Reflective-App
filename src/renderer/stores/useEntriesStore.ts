import { create } from 'zustand';
import type { Entry, NewEntry, UpdateEntry } from '../../types/database';
import { useSyncStore } from './useSyncStore';
import { PrivacyTier } from '../../types/settings';

interface EntriesState {
  entries: Entry[];
  currentEntry: Entry | null;
  isLoading: boolean;
  error: string | null;
  isGeneratingEmbedding: boolean;

  loadEntries: () => Promise<void>;
  getEntry: (id: number) => Promise<void>;
  createEntry: (entry: NewEntry) => Promise<Entry | null>;
  updateEntry: (id: number, updates: UpdateEntry) => Promise<boolean>;
  deleteEntry: (id: number) => Promise<boolean>;
  setCurrentEntry: (entry: Entry | null) => void;
  generateAndSaveEmbedding: (id: number, content: string) => Promise<boolean>;
  generateEmbeddingsForAllEntries: (onProgress?: (current: number, total: number) => void) => Promise<{ success: number; failed: number; errors: Array<{ id: number; error: string; contentLength: number }> }>;
}

export const useEntriesStore = create<EntriesState>((set, get) => ({
  entries: [],
  currentEntry: null,
  isLoading: false,
  error: null,
  isGeneratingEmbedding: false,

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
      let sentimentScore = entry.sentiment_score || 0;

      if (entry.content && entry.content.trim().length > 0) {
        const sentimentResult = await window.electronAPI.ml.analyzeSentiment(entry.content);
        if (sentimentResult.success && sentimentResult.data) {
          sentimentScore = sentimentResult.data.comparative;
        }
      }

      const now = Date.now();
      const result = await window.electronAPI.db.run(
        `INSERT INTO entries (content, word_count, sentiment_score, created_at, updated_at, device_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          entry.content,
          entry.word_count || 0,
          sentimentScore,
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

          useSyncStore.getState().enqueueSyncOperation({
            operation: 'CREATE',
            tableName: 'entries',
            recordId: newEntry.id,
            data: {
              content: newEntry.content,
              word_count: newEntry.word_count,
              sentiment_score: newEntry.sentiment_score,
              created_at: newEntry.created_at,
              updated_at: newEntry.updated_at,
            }
          }).catch(error => {
            console.error('Failed to enqueue CREATE operation:', error);
          });

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

        await window.electronAPI.db.run(
          'DELETE FROM themes WHERE entry_id = ?',
          [id]
        );

        if (updates.content.trim().length > 0 && updates.sentiment_score === undefined) {
          const sentimentResult = await window.electronAPI.ml.analyzeSentiment(updates.content);
          if (sentimentResult.success && sentimentResult.data) {
            setParts.push('sentiment_score = ?');
            values.push(sentimentResult.data.comparative);
          }
        }
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
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updated_at: Date.now() } : e
          ),
          currentEntry:
            state.currentEntry?.id === id
              ? { ...state.currentEntry, ...updates, updated_at: Date.now() }
              : state.currentEntry,
          isLoading: false,
        }));

        useSyncStore.getState().enqueueSyncOperation({
          operation: 'UPDATE',
          tableName: 'entries',
          recordId: id,
          data: updates
        }).catch(error => {
          console.error('Failed to enqueue UPDATE operation:', error);
        });

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

        useSyncStore.getState().enqueueSyncOperation({
          operation: 'DELETE',
          tableName: 'entries',
          recordId: id
        }).catch(error => {
          console.error('Failed to enqueue DELETE operation:', error);
        });

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
  },

  generateAndSaveEmbedding: async (id: number, content: string) => {
    if (!content || content.trim().length === 0) {
      console.warn(`[generateAndSaveEmbedding] Skipping entry ${id} - empty content`);
      return false;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    if (!plainText || plainText.trim().length === 0) {
      console.warn(`[generateAndSaveEmbedding] Skipping entry ${id} - no text content after HTML stripping`);
      return false;
    }

    console.log(`[generateAndSaveEmbedding] Starting for entry ${id}, plain text length: ${plainText.length} (HTML length: ${content.length})`);
    set({ isGeneratingEmbedding: true });
    try {
      const tagsResult = await window.electronAPI.db.query<Array<{ name: string }>>(
        `SELECT t.name FROM tags t
         INNER JOIN entry_tags et ON t.id = et.tag_id
         WHERE et.entry_id = ?
         ORDER BY t.name ASC`,
        [id]
      );

      let textToEmbed = plainText;
      if (tagsResult.success && tagsResult.data && tagsResult.data.length > 0) {
        const tagNames = tagsResult.data.map(t => t.name).join(' ');
        textToEmbed = `${tagNames}. ${plainText}`;
        console.log(`[generateAndSaveEmbedding] Including ${tagsResult.data.length} tags: ${tagNames}`);
      } else {
        console.log(`[generateAndSaveEmbedding] No tags for entry ${id}`);
      }

      console.log(`[generateAndSaveEmbedding] Calling main process to generate embedding...`);
      const embeddingResult = await window.electronAPI.embeddings.generate(textToEmbed);

      if (!embeddingResult.success || !embeddingResult.data) {
        const errorMsg = embeddingResult.error || 'Failed to generate embedding';
        console.error(`[generateAndSaveEmbedding] IPC call failed for entry ${id}: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      console.log(`[generateAndSaveEmbedding] Main process returned embedding with ${embeddingResult.data.embedding.length} dimensions`);

      const embeddingBuffer = new Float32Array(embeddingResult.data.embedding).buffer;

      console.log(`[generateAndSaveEmbedding] Updating database with embedding...`);
      const updateResult = await get().updateEntry(id, {
        embedding: new Uint8Array(embeddingBuffer)
      });

      if (!updateResult) {
        console.error(`[generateAndSaveEmbedding] Database update failed for entry ${id}`);
        set({ isGeneratingEmbedding: false });
        return false;
      }

      console.log(`[generateAndSaveEmbedding] Adding to vector index...`);
      if (embeddingResult.data.embedding) {
        const addResult = await window.electronAPI.embeddings.addEntry(id, embeddingResult.data.embedding);
        console.log(`[generateAndSaveEmbedding] Add to index result:`, addResult);
      }

      set({ isGeneratingEmbedding: false });
      console.log(`[generateAndSaveEmbedding] Successfully completed for entry ${id}`);
      return true;
    } catch (error) {
      console.error(`[generateAndSaveEmbedding] Error for entry ${id}:`, error);
      set({ isGeneratingEmbedding: false, error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  },

  generateEmbeddingsForAllEntries: async (onProgress?: (current: number, total: number) => void) => {
    const entries = get().entries;
    let success = 0;
    let failed = 0;
    const errors: Array<{ id: number; error: string; contentLength: number }> = [];

    console.log(`[EntriesStore] Generating embeddings for ${entries.length} entries`);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const contentLength = entry.content?.length || 0;
      console.log(`[EntriesStore] Processing entry ${entry.id}, content length: ${contentLength}`);

      if (contentLength === 0) {
        console.warn(`[EntriesStore] Skipping entry ${entry.id} - empty content`);
        failed++;
        errors.push({ id: entry.id, error: 'Empty content', contentLength: 0 });
        if (onProgress) onProgress(i + 1, entries.length);
        continue;
      }

      try {
        const result = await get().generateAndSaveEmbedding(entry.id, entry.content);
        if (result) {
          success++;
          console.log(`[EntriesStore] Generated embedding for entry ${entry.id} (${success}/${entries.length})`);
        } else {
          failed++;
          const storeError = get().error;
          const errorDetails = storeError || 'generateAndSaveEmbedding returned false (check console for details)';
          errors.push({ id: entry.id, error: errorDetails, contentLength });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[EntriesStore] Failed to generate embedding for entry ${entry.id}:`, error);
        failed++;
        errors.push({ id: entry.id, error: errorMsg, contentLength });
      }

      if (onProgress) onProgress(i + 1, entries.length);
    }

    console.log(`[EntriesStore] Completed: ${success} success, ${failed} failed`);
    if (errors.length > 0) {
      console.error('[EntriesStore] Errors:', errors);
    }
    return { success, failed, errors };
  },

  regenerateSentimentForAllEntries: async (onProgress?: (current: number, total: number) => void) => {
    const entries = get().entries;
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ id: number; error: string }> = [];

    console.log(`[EntriesStore] Regenerating sentiment for ${entries.length} entries`);

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];

      if (!entry.content || entry.content.trim().length === 0) {
        console.warn(`[EntriesStore] Skipping entry ${entry.id} - empty content`);
        skipped++;
        if (onProgress) onProgress(i + 1, entries.length);
        continue;
      }

      if (entry.sentiment_score !== 0.0 && entry.sentiment_score !== null) {
        console.log(`[EntriesStore] Skipping entry ${entry.id} - already has sentiment score`);
        skipped++;
        if (onProgress) onProgress(i + 1, entries.length);
        continue;
      }

      try {
        const result = await window.electronAPI.ml.analyzeSentiment(entry.content);
        if (result.success && result.data) {
          const sentimentScore = result.data.comparative;
          await window.electronAPI.db.run(
            'UPDATE entries SET sentiment_score = ? WHERE id = ?',
            [sentimentScore, entry.id]
          );
          success++;
          console.log(`[EntriesStore] Updated sentiment for entry ${entry.id}: ${sentimentScore}`);
        } else {
          failed++;
          errors.push({ id: entry.id, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[EntriesStore] Failed to regenerate sentiment for entry ${entry.id}:`, error);
        failed++;
        errors.push({ id: entry.id, error: errorMsg });
      }

      if (onProgress) onProgress(i + 1, entries.length);
    }

    console.log(`[EntriesStore] Sentiment regeneration completed: ${success} success, ${failed} failed, ${skipped} skipped`);
    if (errors.length > 0) {
      console.error('[EntriesStore] Errors:', errors);
    }

    await get().loadEntries();

    return { success, failed, skipped, errors };
  }
}));
