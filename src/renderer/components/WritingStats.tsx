import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { format, differenceInDays } from 'date-fns'

interface WritingStatsProps {
  totalEntries: number
  totalWords: number
  dateRange: { earliest: number; latest: number } | null
  currentStreak: number
  longestStreak: number
  currentStreakStartDate?: number | null
  longestStreakEndDate?: number | null
}

export function WritingStats({ totalEntries, totalWords, dateRange, currentStreak, longestStreak, currentStreakStartDate, longestStreakEndDate }: WritingStatsProps) {
  const avgWordsPerEntry = totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0

  const daysSpan = dateRange
    ? differenceInDays(dateRange.latest, dateRange.earliest) + 1
    : 0

  const entriesPerDay = daysSpan > 0 ? (totalEntries / daysSpan).toFixed(2) : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Writing Statistics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-gray-600">Total Entries</p>
            <p className="text-2xl font-bold">{totalEntries}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-600">Total Words</p>
            <p className="text-2xl font-bold">{totalWords.toLocaleString()}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-600">Avg Words/Entry</p>
            <p className="text-2xl font-bold">{avgWordsPerEntry}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-gray-600">Entries/Day</p>
            <p className="text-2xl font-bold">{entriesPerDay}</p>
          </div>

          {dateRange && (
            <>
              <div className="space-y-1">
                <p className="text-sm text-gray-600">First Entry</p>
                <p className="text-sm font-medium">{format(dateRange.earliest, 'MMM d, yyyy')}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-600">Latest Entry</p>
                <p className="text-sm font-medium">{format(dateRange.latest, 'MMM d, yyyy')}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-600">Current Streak</p>
                <p className="text-2xl font-bold">{currentStreak} {currentStreak === 1 ? 'day' : 'days'}</p>
                {currentStreakStartDate && currentStreak > 0 && (
                  <p className="text-xs text-gray-500">Started {format(currentStreakStartDate, 'MMM d, yyyy')}</p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-600">Longest Streak</p>
                <p className="text-2xl font-bold">{longestStreak} {longestStreak === 1 ? 'day' : 'days'}</p>
                {longestStreakEndDate && longestStreak > 0 && (
                  <p className="text-xs text-gray-500">Ended {format(longestStreakEndDate, 'MMM d, yyyy')}</p>
                )}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
