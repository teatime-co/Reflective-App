import { app, BrowserWindow } from 'electron'
import path from 'path'
import { initializeDatabase, closeDatabase } from './database/init'
import { runMigrations } from './database/migrations'
import { registerDatabaseHandlers } from './ipc/database'

let mainWindow: BrowserWindow | null = null

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

app.whenReady().then(() => {
  const db = initializeDatabase()
  runMigrations(db)
  registerDatabaseHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})
