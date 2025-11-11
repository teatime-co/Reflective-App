import { ipcMain } from 'electron'
import { analyzeSentiment, type SentimentResult } from '../ml/sentiment'
import { extractKeywords, type KeywordResult } from '../ml/keywords'
import { themesService, type ThemeClassification } from '../ml/themes-ollama'
import type { QueryResult } from '../../types/database'

export function registerMLHandlers(): void {
  ipcMain.handle('ml:analyzeSentiment', async (_event, content: string): Promise<QueryResult<SentimentResult>> => {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content: must be a non-empty string')
      }

      const result = analyzeSentiment(content)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('[IPC] ml:analyzeSentiment error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze sentiment'
      }
    }
  })

  ipcMain.handle('ml:extractKeywords', async (_event, content: string): Promise<QueryResult<KeywordResult>> => {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content: must be a non-empty string')
      }

      const result = extractKeywords(content)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('[IPC] ml:extractKeywords error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract keywords'
      }
    }
  })

  ipcMain.handle('ml:generateThemes', async (_event, content: string): Promise<QueryResult<ThemeClassification[]>> => {
    try {
      if (!content || typeof content !== 'string') {
        throw new Error('Invalid content: must be a non-empty string')
      }

      console.log('[IPC] ml:generateThemes - Starting theme generation...')
      const startTime = Date.now()

      const result = await themesService.generateThemes(content)

      const elapsed = Date.now() - startTime
      console.log(`[IPC] ml:generateThemes - Completed in ${elapsed}ms, found ${result.length} themes`)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      console.error('[IPC] ml:generateThemes error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate themes'
      }
    }
  })

  ipcMain.handle('ml:getThemesStatus', async (): Promise<QueryResult<{ initialized: boolean; isInitializing: boolean }>> => {
    try {
      const status = themesService.getStatus()
      return {
        success: true,
        data: status
      }
    } catch (error) {
      console.error('[IPC] ml:getThemesStatus error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get themes status'
      }
    }
  })

  console.log('[IPC] ML handlers registered')
}
