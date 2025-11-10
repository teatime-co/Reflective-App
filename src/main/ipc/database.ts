import { ipcMain } from 'electron';
import { getDatabase } from '../database/init';
import type { DatabaseStats, QueryResult, RunResult } from '../../types/database';
import fs from 'fs';
import { getDatabasePath } from '../database/init';

function validateInput(input: unknown): void {
  if (typeof input === 'string' && (input.includes('--') || input.includes(';'))) {
    throw new Error('Invalid input: SQL injection attempt detected');
  }
}

export function registerDatabaseHandlers(): void {
  ipcMain.handle('db:query', async (_event, sql: string, params: unknown[] = []) => {
    try {
      validateInput(sql);
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const result = params.length > 0 ? stmt.all(...params) : stmt.all();

      return {
        success: true,
        data: result,
      } as QueryResult<unknown[]>;
    } catch (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as QueryResult<unknown[]>;
    }
  });

  ipcMain.handle('db:run', async (_event, sql: string, params: unknown[] = []) => {
    try {
      validateInput(sql);
      const db = getDatabase();
      const stmt = db.prepare(sql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();

      return {
        success: true,
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      } as RunResult;
    } catch (error) {
      console.error('Database run error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as RunResult;
    }
  });

  ipcMain.handle('db:transaction', async (_event, operations: Array<{ sql: string; params?: unknown[] }>) => {
    try {
      const db = getDatabase();
      const results: RunResult[] = [];

      const transaction = db.transaction(() => {
        for (const op of operations) {
          validateInput(op.sql);
          const stmt = db.prepare(op.sql);
          const result = op.params ? stmt.run(...op.params) : stmt.run();
          results.push({
            success: true,
            changes: result.changes,
            lastInsertRowid: Number(result.lastInsertRowid),
          });
        }
      });

      transaction();

      return {
        success: true,
        data: results,
      } as QueryResult<RunResult[]>;
    } catch (error) {
      console.error('Database transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as QueryResult<RunResult[]>;
    }
  });

  ipcMain.handle('db:getStats', async () => {
    try {
      const db = getDatabase();
      const dbPath = getDatabasePath();

      const entriesCount = db.prepare('SELECT COUNT(*) as count FROM entries').get() as { count: number };
      const tagsCount = db.prepare('SELECT COUNT(*) as count FROM tags').get() as { count: number };
      const themesCount = db.prepare('SELECT COUNT(*) as count FROM themes').get() as { count: number };

      const oldestEntry = db.prepare('SELECT MIN(created_at) as oldest FROM entries').get() as { oldest: number | null };
      const newestEntry = db.prepare('SELECT MAX(created_at) as newest FROM entries').get() as { newest: number | null };

      let databaseSize = 0;
      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        databaseSize = stats.size;
      }

      const dbStats: DatabaseStats = {
        totalEntries: entriesCount.count,
        totalTags: tagsCount.count,
        totalThemes: themesCount.count,
        databaseSize,
        oldestEntry: oldestEntry.oldest,
        newestEntry: newestEntry.newest,
      };

      return {
        success: true,
        data: dbStats,
      } as QueryResult<DatabaseStats>;
    } catch (error) {
      console.error('Database stats error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as QueryResult<DatabaseStats>;
    }
  });

  console.log('Database IPC handlers registered');
}
