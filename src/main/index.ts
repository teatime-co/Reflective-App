import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initializeDatabase, closeDatabase, getDatabase } from './database/init'
import { runMigrations } from './database/migrations'
import { registerDatabaseHandlers } from './ipc/database'
import { registerEmbeddingsHandlers } from './ipc/embeddings'
import { registerMLHandlers } from './ipc/ml'
import { registerCryptoHandlers } from './ipc/crypto'
import { registerSyncHandlers } from './ipc/sync'
import { registerSettingsHandlers } from './ipc/settings'
import { registerAuthHandlers } from './ipc/auth'
import { registerConflictHandlers } from './ipc/conflicts'
import { registerStreakHandlers } from './ipc/streaks'
import { initPythonService, pythonService } from './services/pythonService'
import { initializeSyncService, startSyncWorker, stopSyncWorker } from './sync/syncService'
import { initializeTierTransitions } from './sync/tierTransitions'
import { vectorSearchService } from './embeddings/vectorSearch'

let mainWindow: BrowserWindow | null = null
let isShuttingDown = false

async function rebuildVectorIndexAsync(): Promise<void> {
  const startTime = Date.now()
  console.log('[MAIN] Starting automatic vector index rebuild on startup...')

  try {
    const db = getDatabase()
    const entries = db
      .prepare('SELECT id, embedding FROM entries WHERE embedding IS NOT NULL')
      .all() as Array<{ id: string; embedding: Buffer }>

    console.log(`[MAIN] Found ${entries.length} entries with embeddings in database`)

    if (entries.length === 0) {
      console.log('[MAIN] No embeddings to load into index')
      return
    }

    await vectorSearchService.rebuildIndex(entries)

    const elapsedMs = Date.now() - startTime
    console.log(`[MAIN] Vector index rebuilt successfully in ${elapsedMs}ms with ${entries.length} entries`)
  } catch (error) {
    console.error('[MAIN] Error rebuilding vector index:', error)
    throw error
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/index.mjs')
  console.log('[MAIN] Preload path:', preloadPath)
  console.log('[MAIN] __dirname:', __dirname)

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  const db = initializeDatabase()
  runMigrations(db)
  registerDatabaseHandlers()
  registerEmbeddingsHandlers()
  registerMLHandlers()
  registerCryptoHandlers()
  registerSyncHandlers()
  registerSettingsHandlers()
  registerAuthHandlers()
  registerConflictHandlers()
  registerStreakHandlers()

  initializeSyncService(db)
  initializeTierTransitions(db)
  startSyncWorker()
  console.log('[MAIN] Sync service and tier transitions initialized, worker started')

  try {
    console.log('[MAIN] Starting Python embedding service...')
    const service = initPythonService(8765)
    await service.start()
    console.log('[MAIN] Python embedding service started successfully')
  } catch (error) {
    console.error('[MAIN] Failed to start Python embedding service:', error)
    console.error('[MAIN] Embedding features will not be available')
    console.error('[MAIN] Error details:', error instanceof Error ? error.message : String(error))
  }

  rebuildVectorIndexAsync().catch(err => {
    console.error('[MAIN] Failed to rebuild vector index on startup:', err)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

process.on('exit', () => {
  if (pythonService) {
    console.log('[MAIN] Process exiting, stopping Python service...')
    pythonService.stop()
  }
})

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async (event) => {
  if (isShuttingDown) {
    return
  }

  if (pythonService) {
    event.preventDefault()
    isShuttingDown = true

    console.log('[MAIN] Shutting down services before quit...')

    stopSyncWorker()
    console.log('[MAIN] Sync worker stopped')

    try {
      await pythonService.stop()
      console.log('[MAIN] Python service stopped successfully')
    } catch (error) {
      console.error('[MAIN] Error stopping Python service:', error)
    }

    closeDatabase()
    console.log('[MAIN] Database closed')

    isShuttingDown = false
    app.exit(0)
  } else {
    stopSyncWorker()
    closeDatabase()
  }
})
