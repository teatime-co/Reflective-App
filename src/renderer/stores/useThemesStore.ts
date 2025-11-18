import { create } from 'zustand'
import type { Theme } from '../../types/database'
import type { ThemeClassification } from '../../types/ml'

interface ThemesState {
  themes: Theme[]
  isGenerating: boolean
  error: string | null

  generateThemes: (entryId: string, content: string) => Promise<void>
  loadThemesByEntry: (entryId: string) => Promise<void>
  getTopThemes: (limit?: number) => Promise<Array<{ theme_name: string; count: number }>>
  generateThemesForAllEntries: (entries: any[], onProgress?: (current: number, total: number) => void) => Promise<{ success: number; failed: number; errors: Array<{ id: string; error: string }> }>
  clearThemes: () => void
}

export const useThemesStore = create<ThemesState>((set, get) => ({
  themes: [],
  isGenerating: false,
  error: null,

  generateThemes: async (entryId: string, content: string) => {
    set({ isGenerating: true, error: null })

    try {
      const result = await window.electronAPI.ml.generateThemes(content)

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate themes')
      }

      const classifications: ThemeClassification[] = result.data

      if (classifications.length === 0) {
        set({ isGenerating: false })
        return
      }

      await window.electronAPI.db.run(
        'DELETE FROM themes WHERE entry_id = ?',
        [entryId]
      )

      for (const classification of classifications) {
        await window.electronAPI.db.run(
          'INSERT INTO themes (entry_id, theme_name, confidence, created_at) VALUES (?, ?, ?, ?)',
          [entryId, classification.theme, classification.confidence, Date.now()]
        )
      }

      await get().loadThemesByEntry(entryId)

      set({ isGenerating: false })
    } catch (error) {
      console.error('[ThemesStore] Error generating themes:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to generate themes',
        isGenerating: false
      })
    }
  },

  loadThemesByEntry: async (entryId: string) => {
    try {
      const result = await window.electronAPI.db.query<Theme[]>(
        'SELECT * FROM themes WHERE entry_id = ? ORDER BY confidence DESC',
        [entryId]
      )

      if (result.success && result.data) {
        set({ themes: result.data, error: null })
      }
    } catch (error) {
      console.error('[ThemesStore] Error loading themes:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to load themes' })
    }
  },

  getTopThemes: async (limit: number = 10) => {
    try {
      const result = await window.electronAPI.db.query<Array<{ theme_name: string; count: number }>>(
        `SELECT theme_name, COUNT(*) as count
         FROM themes
         GROUP BY theme_name
         ORDER BY count DESC
         LIMIT ?`,
        [limit]
      )

      if (result.success && result.data) {
        return result.data
      }

      return []
    } catch (error) {
      console.error('[ThemesStore] Error getting top themes:', error)
      return []
    }
  },

  clearThemes: () => {
    set({ themes: [], error: null })
  },

  generateThemesForAllEntries: async (
    entries: Array<{ id: string; content: string }>,
    onProgress?: (current: number, total: number) => void
  ) => {
    let success = 0
    let failed = 0
    const errors: Array<{ id: string; error: string }> = []

    console.log(`[ThemesStore] Generating themes for ${entries.length} entries`)

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      if (!entry.content || entry.content.trim().length < 50) {
        console.warn(`[ThemesStore] Skipping entry ${entry.id} - content too short`)
        failed++
        errors.push({ id: entry.id, error: 'Content too short (minimum 50 characters)' })
        if (onProgress) onProgress(i + 1, entries.length)
        continue
      }

      const existingThemesResult = await window.electronAPI.db.query<any[]>(
        'SELECT id FROM themes WHERE entry_id = ? LIMIT 1',
        [entry.id]
      )

      if (existingThemesResult.success && existingThemesResult.data && existingThemesResult.data.length > 0) {
        console.log(`[ThemesStore] Skipping entry ${entry.id} - already has themes`)
        success++
        if (onProgress) onProgress(i + 1, entries.length)
        continue
      }

      try {
        await get().generateThemes(entry.id, entry.content)
        success++
        console.log(`[ThemesStore] Generated themes for entry ${entry.id} (${i + 1}/${entries.length})`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[ThemesStore] Failed to generate themes for entry ${entry.id}:`, error)
        failed++
        errors.push({ id: entry.id, error: errorMsg })
      }

      if (onProgress) onProgress(i + 1, entries.length)
    }

    console.log(`[ThemesStore] Bulk generation completed: ${success} success, ${failed} failed`)
    if (errors.length > 0) {
      console.error('[ThemesStore] Errors:', errors)
    }

    return { success, failed, errors }
  }
}))
