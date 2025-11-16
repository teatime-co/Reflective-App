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
    generateBatch: (texts: string[]) => ipcRenderer.invoke('embeddings:generateBatch', texts),
    search: (queryEmbedding: number[], limit: number) => ipcRenderer.invoke('embeddings:search', queryEmbedding, limit),
    addEntry: (entryId: string, embedding: number[]) => ipcRenderer.invoke('embeddings:addEntry', entryId, embedding),
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
      generateHE: (backendUrl?: string) => ipcRenderer.invoke('crypto:keys:generateHE', backendUrl),
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
    reset: () => ipcRenderer.invoke('settings:reset'),
    onTierTransitionProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('settings:tier-transition-progress', (_event, progress) => callback(progress));
      return () => ipcRenderer.removeAllListeners('settings:tier-transition-progress');
    }
  },

  // Auth IPC handlers
  auth: {
    setToken: (token: string) => ipcRenderer.invoke('auth:setToken', token),
    getToken: () => ipcRenderer.invoke('auth:getToken'),
    clearToken: () => ipcRenderer.invoke('auth:clearToken'),
    setUser: (user: any) => ipcRenderer.invoke('auth:setUser', user),
    getUser: () => ipcRenderer.invoke('auth:getUser'),
    clearUser: () => ipcRenderer.invoke('auth:clearUser'),
    updatePrivacyTier: (token: string, tier: string, hePublicKey?: string | null) =>
      ipcRenderer.invoke('auth:updatePrivacyTier', token, tier, hePublicKey)
  },

  // Conflicts IPC handlers
  conflicts: {
    fetch: () => ipcRenderer.invoke('conflicts:fetch'),
    fetchFromBackend: () => ipcRenderer.invoke('conflicts:fetchFromBackend'),
    resolve: (conflictId: string, resolution: 'local' | 'remote' | 'merged', mergedData?: any) =>
      ipcRenderer.invoke('conflicts:resolve', conflictId, resolution, mergedData),
    getCount: () => ipcRenderer.invoke('conflicts:getCount'),
    delete: (conflictId: string) => ipcRenderer.invoke('conflicts:delete', conflictId)
  }
})

console.log('[PRELOAD] electronAPI exposed successfully')

export {}
