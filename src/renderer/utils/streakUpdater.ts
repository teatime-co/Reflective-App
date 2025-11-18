import { Entry } from '../types/entry'
import { identifyAllStreakPeriods } from './streakCalculator'

export async function rebuildStreaksFromEntries(entries: Entry[]): Promise<void> {
  try {
    const streakPeriods = identifyAllStreakPeriods(entries)

    const result = await window.electronAPI.streaks.rebuild(streakPeriods)

    if (!result.success) {
      console.error('Failed to rebuild streaks:', result.error)
    }
  } catch (error) {
    console.error('Error rebuilding streaks:', error)
  }
}
