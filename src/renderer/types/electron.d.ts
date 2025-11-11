import type { DatabaseStats, QueryResult, RunResult, SyncQueueItem } from '../../types/database'
import type { SearchResult, IndexStatus } from '../../types/embeddings'
import type { ThemeClassification, SentimentResult, KeywordResult } from '../../types/ml'
import type { EncryptedData, HEContext } from '../../main/crypto/types'
import type { AppSettings, SettingsUpdateResult } from '../../types/settings'

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
    generateThemes: (content: string) => Promise<QueryResult<ThemeClassification[]>>
    analyzeSentiment: (content: string) => Promise<QueryResult<SentimentResult>>
    extractKeywords: (content: string) => Promise<QueryResult<KeywordResult>>
    getThemesStatus: () => Promise<QueryResult<{ initialized: boolean; isInitializing: boolean }>>
  }
  crypto: {
    aes: {
      encrypt: (plaintext: string) => Promise<QueryResult<EncryptedData>>
      decrypt: (encryptedData: EncryptedData) => Promise<QueryResult<string>>
    }
    he: {
      getContext: (backendUrl?: string) => Promise<QueryResult<HEContext>>
      initContext: (heContext: HEContext) => Promise<QueryResult<void>>
      encryptMetric: (metricType: string, value: number) => Promise<QueryResult<{
        metric_type: string
        encrypted_value: number[]
        timestamp: Date
      }>>
      decryptMetric: (ciphertext: number[]) => Promise<QueryResult<number>>
    }
    keys: {
      generate: (backendUrl?: string) => Promise<QueryResult<{
        aesKeyGenerated: boolean
        hePublicKey: string
      }>>
      load: () => Promise<QueryResult<{
        aesKeyExists: boolean
        heKeysLoaded: boolean
      }>>
      exists: (keyName: string) => Promise<QueryResult<boolean>>
      delete: (keyName: string) => Promise<QueryResult<boolean>>
      deleteAll: () => Promise<QueryResult<void>>
      getPublicKey: () => Promise<QueryResult<string | null>>
    }
  }
  sync: {
    enqueue: (payload: {
      operation: 'CREATE' | 'UPDATE' | 'DELETE'
      tableName: string
      recordId: number
      data?: Record<string, unknown>
    }) => Promise<{
      success: boolean
      data?: { queueId?: number }
      error?: string
    }>
    processQueue: () => Promise<{
      success: boolean
      data?: {
        processed?: number
        failed?: number
        errors?: string[]
      }
      error?: string
    }>
    getQueue: () => Promise<{
      success: boolean
      data?: { operations?: SyncQueueItem[] }
      error?: string
    }>
    getStatus: () => Promise<{
      success: boolean
      data?: {
        status?: {
          pending: number
          failed: number
          total: number
        }
      }
      error?: string
    }>
    clearQueue: () => Promise<{
      success: boolean
      error?: string
    }>
  }
  settings: {
    get: () => Promise<SettingsUpdateResult>
    update: (partial: Partial<AppSettings>) => Promise<SettingsUpdateResult>
    reset: () => Promise<SettingsUpdateResult>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
