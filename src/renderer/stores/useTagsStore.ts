import { create } from 'zustand';
import type { Tag, NewTag } from '../../types/database';

interface TagsState {
  tags: Tag[];
  entryTags: Map<string, Tag[]>;
  isLoading: boolean;
  error: string | null;

  loadTags: () => Promise<void>;
  getTagsForEntry: (entryId: string) => Promise<void>;
  createTag: (tag: NewTag) => Promise<Tag | null>;
  updateTag: (id: number, updates: Partial<Tag>) => Promise<boolean>;
  deleteTag: (id: number) => Promise<boolean>;
  addTagToEntry: (entryId: string, tagId: number) => Promise<boolean>;
  removeTagFromEntry: (entryId: string, tagId: number) => Promise<boolean>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  entryTags: new Map(),
  isLoading: false,
  error: null,

  loadTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.query<Tag[]>(
        'SELECT * FROM tags ORDER BY usage_count DESC, name ASC'
      );

      if (result.success && result.data) {
        set({ tags: result.data, isLoading: false });
      } else {
        set({ error: result.error || 'Failed to load tags', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  getTagsForEntry: async (entryId: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.query<Tag[]>(
        `SELECT t.* FROM tags t
         INNER JOIN entry_tags et ON t.id = et.tag_id
         WHERE et.entry_id = ?
         ORDER BY t.name ASC`,
        [entryId]
      );

      if (result.success && result.data) {
        set((state) => {
          const newEntryTags = new Map(state.entryTags);
          newEntryTags.set(entryId, result.data || []);
          return { entryTags: newEntryTags, isLoading: false };
        });
      } else {
        set({ error: result.error || 'Failed to load tags for entry', isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
    }
  },

  createTag: async (tag: NewTag) => {
    set({ isLoading: true, error: null });
    try {
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
      const color = tag.color || colors[Math.floor(Math.random() * colors.length)];

      const result = await window.electronAPI.db.run(
        'INSERT INTO tags (name, color, created_at, usage_count) VALUES (?, ?, ?, ?)',
        [tag.name, color, Date.now(), 0]
      );

      if (result.success && result.lastInsertRowid) {
        const newTagResult = await window.electronAPI.db.query<Tag[]>(
          'SELECT * FROM tags WHERE id = ?',
          [result.lastInsertRowid]
        );

        if (newTagResult.success && newTagResult.data && newTagResult.data.length > 0) {
          const newTag = newTagResult.data[0];
          set((state) => ({
            tags: [...state.tags, newTag],
            isLoading: false
          }));
          return newTag;
        }
      }

      set({ error: result.error || 'Failed to create tag', isLoading: false });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return null;
    }
  },

  updateTag: async (id: number, updates: Partial<Tag>) => {
    set({ isLoading: true, error: null });
    try {
      const setParts: string[] = [];
      const values: any[] = [];

      if (updates.name !== undefined) {
        setParts.push('name = ?');
        values.push(updates.name);
      }
      if (updates.color !== undefined) {
        setParts.push('color = ?');
        values.push(updates.color);
      }

      if (setParts.length === 0) {
        set({ isLoading: false });
        return false;
      }

      values.push(id);

      const result = await window.electronAPI.db.run(
        `UPDATE tags SET ${setParts.join(', ')} WHERE id = ?`,
        values
      );

      if (result.success) {
        await get().loadTags();
        set({ isLoading: false });
        return true;
      }

      set({ error: result.error || 'Failed to update tag', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  },

  deleteTag: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.run(
        'DELETE FROM tags WHERE id = ?',
        [id]
      );

      if (result.success) {
        set((state) => ({
          tags: state.tags.filter((t) => t.id !== id),
          isLoading: false
        }));
        return true;
      }

      set({ error: result.error || 'Failed to delete tag', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  },

  addTagToEntry: async (entryId: string, tagId: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.run(
        'INSERT INTO entry_tags (entry_id, tag_id, created_at) VALUES (?, ?, ?)',
        [entryId, tagId, Date.now()]
      );

      if (result.success) {
        await window.electronAPI.db.run(
          'UPDATE tags SET usage_count = usage_count + 1 WHERE id = ?',
          [tagId]
        );

        await get().getTagsForEntry(entryId);
        await get().loadTags();
        set({ isLoading: false });
        return true;
      }

      set({ error: result.error || 'Failed to add tag to entry', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  },

  removeTagFromEntry: async (entryId: string, tagId: number) => {
    set({ isLoading: true, error: null });
    try {
      const result = await window.electronAPI.db.run(
        'DELETE FROM entry_tags WHERE entry_id = ? AND tag_id = ?',
        [entryId, tagId]
      );

      if (result.success) {
        await window.electronAPI.db.run(
          'UPDATE tags SET usage_count = usage_count - 1 WHERE id = ?',
          [tagId]
        );

        await get().getTagsForEntry(entryId);
        await get().loadTags();
        set({ isLoading: false });
        return true;
      }

      set({ error: result.error || 'Failed to remove tag from entry', isLoading: false });
      return false;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', isLoading: false });
      return false;
    }
  }
}));
