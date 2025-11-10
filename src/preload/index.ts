import { contextBridge, ipcRenderer } from 'electron'

console.log('[PRELOAD] Preload script starting...')

contextBridge.exposeInMainWorld('electronAPI', {
  // Database IPC handlers (to be implemented in Phase 2)
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    run: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params),
    transaction: (operations: any[]) => ipcRenderer.invoke('db:transaction', operations),
    getStats: () => ipcRenderer.invoke('db:getStats')
  },

  // Embeddings IPC handlers (to be implemented in Phase 4)
  embeddings: {
    generate: (text: string) => ipcRenderer.invoke('embeddings:generate', text),
    search: (query: string, limit: number) => ipcRenderer.invoke('embeddings:search', query, limit),
    rebuild: () => ipcRenderer.invoke('embeddings:rebuild')
  },

  // ML IPC handlers (to be implemented in Phase 5)
  ml: {
    generateThemes: (content: string) => ipcRenderer.invoke('ml:generateThemes', content),
    analyzeSentiment: (content: string) => ipcRenderer.invoke('ml:analyzeSentiment', content),
    extractKeywords: (content: string) => ipcRenderer.invoke('ml:extractKeywords', content)
  }
})

console.log('[PRELOAD] electronAPI exposed successfully')

export {}
