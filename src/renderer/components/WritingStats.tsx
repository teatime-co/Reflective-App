import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { format, differenceInDays } from 'date-fns'

interface WritingStatsProps {
  totalEntries: number
  totalWords: number
  dateRange: { earliest: number; latest: number } | null
}

export function WritingStats({ totalEntries, totalWords, dateRange }: WritingStatsProps) {
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

              <div className="space-y-1 col-span-2">
                <p className="text-sm text-gray-600">Writing Period</p>
                <p className="text-sm font-medium">{daysSpan} {daysSpan === 1 ? 'day' : 'days'}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
