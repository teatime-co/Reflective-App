import { create } from 'zustand';
import type { SearchResult, IndexStatus } from '../../types/embeddings';
import { LRUCache } from '../lib/queryCache';

const searchCache = new LRUCache<SearchResult[]>(50, 5 * 60 * 1000);
const embeddingCache = new LRUCache<number[]>(100, 10 * 60 * 1000);

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

    const cacheKey = `${query.toLowerCase().trim()}:${limit}`;
    const cachedResults = searchCache.get(cacheKey);
    if (cachedResults) {
      set({ searchResults: cachedResults, isSearching: false, error: null });
      return;
    }

    set({ isSearching: true, error: null });
    try {
      const embeddingCacheKey = query.toLowerCase().trim();
      let embedding = embeddingCache.get(embeddingCacheKey);

      if (!embedding) {
        const embeddingResult = await window.electronAPI.embeddings.generate(query);

        if (!embeddingResult.success || !embeddingResult.data) {
          throw new Error(embeddingResult.error || 'Failed to generate embedding');
        }

        embedding = embeddingResult.data.embedding;
        embeddingCache.set(embeddingCacheKey, embedding);
      }

      const result = await window.electronAPI.embeddings.search(embedding, limit);

      if (result.success && result.data) {
        searchCache.set(cacheKey, result.data);
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
        searchCache.clear();
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

export const invalidateSearchCache = () => {
  searchCache.clear();
};