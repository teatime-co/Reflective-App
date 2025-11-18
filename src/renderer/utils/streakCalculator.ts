import { Entry } from '../types/entry'

const MIN_WORD_COUNT_FOR_STREAK = 50

export interface StreakPeriod {
  start_date: number
  end_date: number
  days_count: number
}

interface DayEntries {
  [dayKey: string]: Entry[]
}

function getLocalDayKey(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getStartOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function groupEntriesByDay(entries: Entry[]): DayEntries {
  const dayGroups: DayEntries = {}

  entries.forEach(entry => {
    const dayKey = getLocalDayKey(entry.created_at)
    if (!dayGroups[dayKey]) {
      dayGroups[dayKey] = []
    }
    dayGroups[dayKey].push(entry)
  })

  return dayGroups
}

function doesDayMeetStreak(dayEntries: Entry[]): boolean {
  const totalWords = dayEntries.reduce((sum, entry) => sum + (entry.word_count || 0), 0)
  return totalWords >= MIN_WORD_COUNT_FOR_STREAK
}

function getDaysBetween(date1: number, date2: number): number {
  const oneDay = 24 * 60 * 60 * 1000
  const startOfDay1 = getStartOfDay(date1)
  const startOfDay2 = getStartOfDay(date2)
  return Math.round(Math.abs((startOfDay2 - startOfDay1) / oneDay))
}

export function calculateCurrentStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0

  const dayGroups = groupEntriesByDay(entries)
  const validDays = Object.keys(dayGroups)
    .filter(dayKey => doesDayMeetStreak(dayGroups[dayKey]))
    .sort()
    .reverse()

  if (validDays.length === 0) return 0

  const today = getLocalDayKey(Date.now())
  const yesterday = getLocalDayKey(Date.now() - 24 * 60 * 60 * 1000)

  if (validDays[0] !== today && validDays[0] !== yesterday) {
    return 0
  }

  let streakCount = 1
  let currentDate = new Date(validDays[0])

  for (let i = 1; i < validDays.length; i++) {
    const prevDate = new Date(validDays[i])
    const dayDiff = getDaysBetween(currentDate.getTime(), prevDate.getTime())

    if (dayDiff === 1) {
      streakCount++
      currentDate = prevDate
    } else {
      break
    }
  }

  return streakCount
}

export function calculateLongestStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0

  const dayGroups = groupEntriesByDay(entries)
  const validDays = Object.keys(dayGroups)
    .filter(dayKey => doesDayMeetStreak(dayGroups[dayKey]))
    .sort()

  if (validDays.length === 0) return 0

  let maxStreak = 1
  let currentStreak = 1
  let currentDate = new Date(validDays[0])

  for (let i = 1; i < validDays.length; i++) {
    const nextDate = new Date(validDays[i])
    const dayDiff = getDaysBetween(currentDate.getTime(), nextDate.getTime())

    if (dayDiff === 1) {
      currentStreak++
      maxStreak = Math.max(maxStreak, currentStreak)
    } else {
      currentStreak = 1
    }

    currentDate = nextDate
  }

  return maxStreak
}

export function identifyAllStreakPeriods(entries: Entry[]): StreakPeriod[] {
  if (entries.length === 0) return []

  const dayGroups = groupEntriesByDay(entries)
  const validDays = Object.keys(dayGroups)
    .filter(dayKey => doesDayMeetStreak(dayGroups[dayKey]))
    .sort()

  if (validDays.length === 0) return []

  const streakPeriods: StreakPeriod[] = []
  let streakStart = new Date(validDays[0]).getTime()
  let streakEnd = streakStart
  let streakCount = 1

  for (let i = 1; i < validDays.length; i++) {
    const currentDate = new Date(validDays[i])
    const prevDate = new Date(validDays[i - 1])
    const dayDiff = getDaysBetween(prevDate.getTime(), currentDate.getTime())

    if (dayDiff === 1) {
      streakEnd = currentDate.getTime()
      streakCount++
    } else {
      streakPeriods.push({
        start_date: getStartOfDay(streakStart),
        end_date: getStartOfDay(streakEnd),
        days_count: streakCount
      })

      streakStart = currentDate.getTime()
      streakEnd = streakStart
      streakCount = 1
    }
  }

  streakPeriods.push({
    start_date: getStartOfDay(streakStart),
    end_date: getStartOfDay(streakEnd),
    days_count: streakCount
  })

  return streakPeriods
}
