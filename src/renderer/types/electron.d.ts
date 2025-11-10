import type { DatabaseStats, QueryResult, RunResult } from '../../types/database'

export interface ElectronAPI {
  db: {
    query: (sql: string, params?: unknown[]) => Promise<QueryResult<unknown[]>>
    run: (sql: string, params?: unknown[]) => Promise<RunResult>
    transaction: (operations: Array<{ sql: string; params?: unknown[] }>) => Promise<QueryResult<RunResult[]>>
    getStats: () => Promise<QueryResult<DatabaseStats>>
  }
  embeddings: {
    generate: (text: string) => Promise<Float32Array>
    search: (query: string, limit: number) => Promise<number[]>
    rebuild: () => Promise<void>
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
