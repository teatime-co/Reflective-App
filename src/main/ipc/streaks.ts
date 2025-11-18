import { ipcMain } from 'electron'
import { getDatabase } from '../database/init'
import type { QueryResult, RunResult } from '../../types/database'

export interface StreakRecord {
  id: number
  start_date: number
  end_date: number
  days_count: number
  created_at: number
}

export interface StreakPeriod {
  start_date: number
  end_date: number
  days_count: number
}

export interface StreakStats {
  current_streak: number
  longest_streak: number
}

export function registerStreakHandlers(): void {
  ipcMain.handle('streaks:insert', async (_event, period: StreakPeriod) => {
    try {
      const db = getDatabase()
      const stmt = db.prepare(
        'INSERT INTO streaks (start_date, end_date, days_count) VALUES (?, ?, ?)'
      )
      const result = stmt.run(period.start_date, period.end_date, period.days_count)

      return {
        success: true,
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid,
      } as RunResult
    } catch (error) {
      console.error('Insert streak error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as RunResult
    }
  })

  ipcMain.handle('streaks:insertMany', async (_event, periods: StreakPeriod[]) => {
    try {
      const db = getDatabase()

      const transaction = db.transaction(() => {
        const stmt = db.prepare(
          'INSERT INTO streaks (start_date, end_date, days_count) VALUES (?, ?, ?)'
        )

        for (const period of periods) {
          stmt.run(period.start_date, period.end_date, period.days_count)
        }
      })

      transaction()

      return {
        success: true,
        changes: periods.length,
      } as RunResult
    } catch (error) {
      console.error('Insert many streaks error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as RunResult
    }
  })

  ipcMain.handle('streaks:getAll', async () => {
    try {
      const db = getDatabase()
      const stmt = db.prepare('SELECT * FROM streaks ORDER BY end_date DESC')
      const result = stmt.all() as StreakRecord[]

      return {
        success: true,
        data: result,
      } as QueryResult<StreakRecord[]>
    } catch (error) {
      console.error('Get all streaks error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as QueryResult<StreakRecord[]>
    }
  })

  ipcMain.handle('streaks:getLongest', async () => {
    try {
      const db = getDatabase()
      const stmt = db.prepare(
        'SELECT MAX(days_count) as longest FROM streaks'
      )
      const result = stmt.get() as { longest: number | null }

      return {
        success: true,
        data: result.longest || 0,
      } as QueryResult<number>
    } catch (error) {
      console.error('Get longest streak error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as QueryResult<number>
    }
  })

  ipcMain.handle('streaks:clear', async () => {
    try {
      const db = getDatabase()
      const stmt = db.prepare('DELETE FROM streaks')
      const result = stmt.run()

      return {
        success: true,
        changes: result.changes,
      } as RunResult
    } catch (error) {
      console.error('Clear streaks error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as RunResult
    }
  })

  ipcMain.handle('streaks:rebuild', async (_event, periods: StreakPeriod[]) => {
    try {
      const db = getDatabase()

      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM streaks').run()

        const stmt = db.prepare(
          'INSERT INTO streaks (start_date, end_date, days_count) VALUES (?, ?, ?)'
        )

        for (const period of periods) {
          stmt.run(period.start_date, period.end_date, period.days_count)
        }
      })

      transaction()

      return {
        success: true,
        changes: periods.length,
      } as RunResult
    } catch (error) {
      console.error('Rebuild streaks error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as RunResult
    }
  })

  console.log('Streak IPC handlers registered')
}
