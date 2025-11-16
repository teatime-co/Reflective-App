import { ipcMain } from 'electron';
import { vectorSearchService } from '../embeddings/vectorSearch';
import { getDatabase } from '../database/init';
import type { QueryResult } from '../../types/database';
import type { SearchResult, IndexStatus } from '../../types/embeddings';
import { pythonService } from '../services/pythonService';

export function registerEmbeddingsHandlers(): void {
  ipcMain.handle('embeddings:generate', async (_event, text: string) => {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Invalid text input');
      }

      if (!pythonService) {
        throw new Error('Python service not initialized. The embedding service failed to start.');
      }

      if (!pythonService.isServiceReady()) {
        throw new Error('Python service is not ready. The embedding model may still be loading.');
      }

      const embedding = await pythonService.embed(text);

      return {
        success: true,
        data: { embedding, dimensions: embedding.length }
      };
    } catch (error) {
      console.error('[IPC] Generate embedding error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IPC] Error details:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  });

  ipcMain.handle('embeddings:generateBatch', async (_event, texts: string[]) => {
    try {
      if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error('Invalid texts input: must be non-empty array');
      }

      if (!pythonService) {
        throw new Error('Python service not initialized. The embedding service failed to start.');
      }

      if (!pythonService.isServiceReady()) {
        throw new Error('Python service is not ready. The embedding model may still be loading.');
      }

      const embeddings = await pythonService.embedBatch(texts);

      return {
        success: true,
        data: { embeddings, count: embeddings.length }
      };
    } catch (error) {
      console.error('[IPC] Generate batch embeddings error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[IPC] Error details:', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  });

  ipcMain.handle('embeddings:search', async (_event, queryEmbedding: number[], limit: number = 10) => {
    try {
      if (!Array.isArray(queryEmbedding) || queryEmbedding.length !== 384) {
        throw new Error('Invalid query embedding');
      }

      const embedding = new Float32Array(queryEmbedding);
      const searchResults = await vectorSearchService.search(embedding, limit);

      if (searchResults.length === 0) {
        return {
          success: true,
          data: []
        } as QueryResult<SearchResult[]>;
      }

      const db = getDatabase();
      const entryIds = searchResults.map(r => r.entryId);
      const placeholders = entryIds.map(() => '?').join(',');

      const entries = db
        .prepare(`SELECT id, content, created_at, updated_at, word_count, sentiment_score FROM entries WHERE id IN (${placeholders})`)
        .all(...entryIds) as Array<{
          id: string;
          content: string;
          created_at: number;
          updated_at: number;
          word_count: number;
          sentiment_score: number | null;
        }>;

      const entryMap = new Map(entries.map(e => [e.id, e]));

      const results: SearchResult[] = searchResults
        .map(result => {
          const entry = entryMap.get(result.entryId);
          if (!entry) return null;

          const preview = entry.content.length > 200
            ? entry.content.substring(0, 200) + '...'
            : entry.content;

          return {
            entryId: result.entryId,
            score: result.score,
            entry,
            preview
          };
        })
        .filter((r): r is SearchResult => r !== null);

      return {
        success: true,
        data: results
      } as QueryResult<SearchResult[]>;
    } catch (error) {
      console.error('[IPC] Search error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as QueryResult<SearchResult[]>;
    }
  });

  ipcMain.handle('embeddings:addEntry', async (_event, entryId: string, embeddingArray: number[]) => {
    try {
      if (!entryId || typeof entryId !== 'string') {
        throw new Error('Invalid entry ID');
      }

      if (!Array.isArray(embeddingArray) || embeddingArray.length !== 384) {
        throw new Error('Invalid embedding array');
      }

      const embedding = new Float32Array(embeddingArray);
      await vectorSearchService.addEntry(entryId, embedding);

      return {
        success: true,
        data: { entryId }
      };
    } catch (error) {
      console.error('[IPC] Add entry to index error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('embeddings:rebuild', async () => {
    try {
      console.log('[IPC] Starting index rebuild');
      const db = getDatabase();

      const entries = db
        .prepare('SELECT id, embedding FROM entries WHERE embedding IS NOT NULL')
        .all() as Array<{ id: string; embedding: Buffer }>;

      await vectorSearchService.rebuildIndex(entries);

      return {
        success: true,
        data: { count: entries.length }
      };
    } catch (error) {
      console.error('[IPC] Index rebuild error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('embeddings:getStatus', async () => {
    try {
      const status = vectorSearchService.getStatus();

      return {
        success: true,
        data: status
      } as QueryResult<IndexStatus>;
    } catch (error) {
      console.error('[IPC] Get status error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as QueryResult<IndexStatus>;
    }
  });
}
