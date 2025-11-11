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

  // Embeddings IPC handlers
  embeddings: {
    generate: (text: string) => ipcRenderer.invoke('embeddings:generate', text),
    search: (queryEmbedding: number[], limit: number) => ipcRenderer.invoke('embeddings:search', queryEmbedding, limit),
    addEntry: (entryId: number, embedding: number[]) => ipcRenderer.invoke('embeddings:addEntry', entryId, embedding),
    rebuild: () => ipcRenderer.invoke('embeddings:rebuild'),
    getStatus: () => ipcRenderer.invoke('embeddings:getStatus')
  },

  // ML IPC handlers
  ml: {
    generateThemes: (content: string) => ipcRenderer.invoke('ml:generateThemes', content),
    analyzeSentiment: (content: string) => ipcRenderer.invoke('ml:analyzeSentiment', content),
    extractKeywords: (content: string) => ipcRenderer.invoke('ml:extractKeywords', content),
    getThemesStatus: () => ipcRenderer.invoke('ml:getThemesStatus')
  },

  // Crypto IPC handlers
  crypto: {
    aes: {
      encrypt: (plaintext: string) => ipcRenderer.invoke('crypto:aes:encrypt', plaintext),
      decrypt: (encryptedData: any) => ipcRenderer.invoke('crypto:aes:decrypt', encryptedData)
    },
    he: {
      getContext: (backendUrl?: string) => ipcRenderer.invoke('crypto:he:getContext', backendUrl),
      initContext: (heContext: any) => ipcRenderer.invoke('crypto:he:initContext', heContext),
      encryptMetric: (metricType: string, value: number) => ipcRenderer.invoke('crypto:he:encryptMetric', metricType, value),
      decryptMetric: (ciphertext: number[]) => ipcRenderer.invoke('crypto:he:decryptMetric', ciphertext)
    },
    keys: {
      generate: (backendUrl?: string) => ipcRenderer.invoke('crypto:keys:generate', backendUrl),
      load: () => ipcRenderer.invoke('crypto:keys:load'),
      exists: (keyName: string) => ipcRenderer.invoke('crypto:keys:exists', keyName),
      delete: (keyName: string) => ipcRenderer.invoke('crypto:keys:delete', keyName),
      deleteAll: () => ipcRenderer.invoke('crypto:keys:deleteAll'),
      getPublicKey: () => ipcRenderer.invoke('crypto:keys:getPublicKey')
    }
  },

  // Sync IPC handlers
  sync: {
    enqueue: (payload: any) => ipcRenderer.invoke('sync:enqueue', payload),
    processQueue: () => ipcRenderer.invoke('sync:processQueue'),
    getQueue: () => ipcRenderer.invoke('sync:getQueue'),
    getStatus: () => ipcRenderer.invoke('sync:getStatus'),
    clearQueue: () => ipcRenderer.invoke('sync:clearQueue')
  },

  // Settings IPC handlers
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (partial: any) => ipcRenderer.invoke('settings:update', partial),
    reset: () => ipcRenderer.invoke('settings:reset')
  }
})

console.log('[PRELOAD] electronAPI exposed successfully')

export {}
