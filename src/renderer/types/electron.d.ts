import type { DatabaseStats, QueryResult, RunResult } from '../../types/database'
import type { SearchResult, IndexStatus } from '../../types/embeddings'

export interface ElectronAPI {
  db: {
    query: <T = unknown[]>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>
    run: (sql: string, params?: unknown[]) => Promise<RunResult>
    transaction: (operations: Array<{ sql: string; params?: unknown[] }>) => Promise<QueryResult<RunResult[]>>
    getStats: () => Promise<QueryResult<DatabaseStats>>
  }
  embeddings: {
    generate: (text: string) => Promise<QueryResult<{ embedding: number[]; dimensions: number }>>
    search: (queryEmbedding: number[], limit: number) => Promise<QueryResult<SearchResult[]>>
    addEntry: (entryId: number, embedding: number[]) => Promise<QueryResult<{ entryId: number }>>
    rebuild: () => Promise<QueryResult<{ count: number }>>
    getStatus: () => Promise<QueryResult<IndexStatus>>
  }
  ml: {
    generateThemes: (content: string) => Promise<unknown[]>
    analyzeSentiment: (content: string) => Promise<number>
    extractKeywords: (content: string) => Promise<string[]>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
