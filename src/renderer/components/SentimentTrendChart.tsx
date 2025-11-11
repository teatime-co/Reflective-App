import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { format } from 'date-fns'

interface SentimentData {
  date: number
  sentiment: number
}

interface SentimentTrendChartProps {
  data: SentimentData[]
}

export function SentimentTrendChart({ data }: SentimentTrendChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sentiment Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No sentiment data available yet.</p>
        </CardContent>
      </Card>
    )
  }

  const sortedData = [...data].sort((a, b) => a.date - b.date).slice(-30)

  const maxSentiment = Math.max(...sortedData.map(d => Math.abs(d.sentiment)))
  const chartHeight = 200

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.05) return 'bg-green-500'
    if (sentiment < -0.05) return 'bg-red-500'
    return 'bg-gray-400'
  }

  const getSentimentLabel = (sentiment: number) => {
    if (sentiment > 0.05) return 'Positive'
    if (sentiment < -0.05) return 'Negative'
    return 'Neutral'
  }

  const avgSentiment = sortedData.reduce((acc, d) => acc + d.sentiment, 0) / sortedData.length

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Trend (Last 30 Entries)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Average: <span className="font-semibold">{avgSentiment.toFixed(3)}</span> ({getSentimentLabel(avgSentiment)})
          </p>
        </div>
        <div className="flex items-end justify-between gap-1" style={{ height: chartHeight }}>
          {sortedData.map((item, index) => {
            const barHeight = maxSentiment > 0 ? Math.abs(item.sentiment / maxSentiment) * (chartHeight - 20) : 0
            const isPositive = item.sentiment >= 0

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center justify-end group relative"
              >
                <div
                  className={`w-full ${getSentimentColor(item.sentiment)} rounded-t transition-all duration-200 hover:opacity-80`}
                  style={{ height: `${Math.max(barHeight, 2)}px` }}
                />
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  {format(item.date, 'MMM d')}: {item.sentiment.toFixed(3)}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-center items-center gap-4 mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Positive</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-400 rounded"></div>
            <span>Neutral</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Negative</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
