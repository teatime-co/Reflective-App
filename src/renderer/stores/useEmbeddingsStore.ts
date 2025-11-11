import { create } from 'zustand';
import type { SearchResult, IndexStatus } from '../../types/embeddings';

interface EmbeddingsState {
  query: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  isIndexing: boolean;
  indexStatus: IndexStatus | null;
  error: string | null;

  setQuery: (query: string) => void;
  searchSimilar: (query: string, limit?: number) => Promise<void>;
  rebuildIndex: () => Promise<void>;
  checkStatus: () => Promise<void>;
  clearResults: () => void;
}

export const useEmbeddingsStore = create<EmbeddingsState>((set) => ({
  query: '',
  searchResults: [],
  isSearching: false,
  isIndexing: false,
  indexStatus: null,
  error: null,

  setQuery: (query: string) => {
    set({ query });
  },

  searchSimilar: async (query: string, limit: number = 10) => {
    if (!query || query.trim().length === 0) {
      set({ searchResults: [], error: null });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const embeddingResult = await window.electronAPI.embeddings.generate(query);

      if (!embeddingResult.success || !embeddingResult.data) {
        throw new Error(embeddingResult.error || 'Failed to generate embedding');
      }

      const result = await window.electronAPI.embeddings.search(embeddingResult.data.embedding, limit);

      if (result.success && result.data) {
        set({ searchResults: result.data, isSearching: false });
      } else {
        set({
          searchResults: [],
          error: result.error || 'Search failed',
          isSearching: false
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      set({
        searchResults: [],
        error: error instanceof Error ? error.message : 'Unknown error',
        isSearching: false
      });
    }
  },

  rebuildIndex: async () => {
    set({ isIndexing: true, error: null });
    try {
      console.log('[EmbeddingsStore] Starting index rebuild');
      const result = await window.electronAPI.embeddings.rebuild();

      if (result.success) {
        console.log('[EmbeddingsStore] Index rebuilt successfully');
        await useEmbeddingsStore.getState().checkStatus();
        set({ isIndexing: false });
      } else {
        set({
          error: result.error || 'Index rebuild failed',
          isIndexing: false
        });
      }
    } catch (error) {
      console.error('Index rebuild error:', error);
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isIndexing: false
      });
    }
  },

  checkStatus: async () => {
    try {
      const result = await window.electronAPI.embeddings.getStatus();

      if (result.success && result.data) {
        set({ indexStatus: result.data });
      } else {
        set({ error: result.error || 'Failed to get status' });
      }
    } catch (error) {
      console.error('Status check error:', error);
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  },

  clearResults: () => {
    set({ query: '', searchResults: [], error: null });
  }
}));