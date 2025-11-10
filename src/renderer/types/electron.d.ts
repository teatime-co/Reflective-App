export interface ElectronAPI {
  db: {
    query: (sql: string, params?: any[]) => Promise<any[]>
    run: (sql: string, params?: any[]) => Promise<void>
    transaction: (operations: any[]) => Promise<void>
    getStats: () => Promise<any>
  }
  embeddings: {
    generate: (text: string) => Promise<Float32Array>
    search: (query: string, limit: number) => Promise<number[]>
    rebuild: () => Promise<void>
  }
  ml: {
    generateThemes: (content: string) => Promise<any[]>
    analyzeSentiment: (content: string) => Promise<number>
    extractKeywords: (content: string) => Promise<string[]>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
