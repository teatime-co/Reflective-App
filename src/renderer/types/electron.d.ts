import type { DatabaseStats, QueryResult, RunResult, SyncQueueItem } from '../../types/database'
import type { SearchResult, IndexStatus } from '../../types/embeddings'
import type { ThemeClassification, SentimentResult, KeywordResult } from '../../types/ml'
import type { EncryptedData, HEContext } from '../../main/crypto/types'
import type { AppSettings, SettingsUpdateResult } from '../../types/settings'
import type { LocalConflict } from '../../types/conflicts'

export interface ElectronAPI {
  db: {
    query: <T = unknown[]>(sql: string, params?: unknown[]) => Promise<QueryResult<T>>
    run: (sql: string, params?: unknown[]) => Promise<RunResult>
    transaction: (operations: Array<{ sql: string; params?: unknown[] }>) => Promise<QueryResult<RunResult[]>>
    getStats: () => Promise<QueryResult<DatabaseStats>>
  }
  embeddings: {
    generate: (text: string) => Promise<QueryResult<{ embedding: number[]; dimensions: number }>>
    generateBatch: (texts: string[]) => Promise<QueryResult<{ embeddings: number[][]; count: number }>>
    search: (queryEmbedding: number[], limit: number) => Promise<QueryResult<SearchResult[]>>
    addEntry: (entryId: string, embedding: number[]) => Promise<QueryResult<{ entryId: string }>>
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
      generateHE: (backendUrl?: string) => Promise<QueryResult<{
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
      recordId: string
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
    onTierTransitionProgress: (callback: (progress: any) => void) => () => void
  }
  auth: {
    setToken: (token: string) => Promise<{ success: boolean; error?: string }>
    getToken: () => Promise<{ success: boolean; data?: string | null; error?: string }>
    clearToken: () => Promise<{ success: boolean; error?: string }>
    setUser: (user: any) => Promise<{ success: boolean; error?: string }>
    getUser: () => Promise<{ success: boolean; data?: any; error?: string }>
    clearUser: () => Promise<{ success: boolean; error?: string }>
  }
  conflicts: {
    fetch: () => Promise<{
      success: boolean
      data?: { conflicts?: LocalConflict[] }
      error?: string
    }>
    fetchFromBackend: () => Promise<{
      success: boolean
      data?: { conflicts?: LocalConflict[] }
      error?: string
    }>
    resolve: (
      conflictId: string,
      resolution: 'local' | 'remote' | 'merged',
      mergedData?: {
        encryptedContent: string
        iv: string
        tag: string
      }
    ) => Promise<{
      success: boolean
      error?: string
    }>
    getCount: () => Promise<{
      success: boolean
      data?: { count?: number }
      error?: string
    }>
    delete: (conflictId: string) => Promise<{
      success: boolean
      error?: string
    }>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
