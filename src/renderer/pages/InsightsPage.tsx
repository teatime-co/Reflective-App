import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { BarChart3, Sparkles, TrendingUp, Hash } from 'lucide-react'
import { ThemeDistributionChart } from '../components/ThemeDistributionChart'
import { SentimentTrendChart } from '../components/SentimentTrendChart'
import { KeywordsCloud } from '../components/KeywordsCloud'
import { WritingStats } from '../components/WritingStats'
import { useEntriesStore } from '../stores/useEntriesStore'
import { useThemesStore } from '../stores/useThemesStore'
import type { Entry } from '../../types/database'

interface ThemeData {
  theme_name: string
  count: number
}

interface KeywordCount {
  keyword: string
  count: number
}

export function InsightsPage() {
  const { entries, loadEntries, regenerateSentimentForAllEntries } = useEntriesStore()
  const { getTopThemes, generateThemesForAllEntries } = useThemesStore()

  const [themeData, setThemeData] = useState<ThemeData[]>([])
  const [sentimentData, setSentimentData] = useState<Array<{ date: number; sentiment: number }>>([])
  const [keywordData, setKeywordData] = useState<KeywordCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)
  const [isGeneratingThemes, setIsGeneratingThemes] = useState(false)
  const [themesProgress, setThemesProgress] = useState({ current: 0, total: 0 })
  const [currentOperation, setCurrentOperation] = useState<'sentiment' | 'themes' | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)

    await loadEntries()

    const themes = await getTopThemes(10)
    setThemeData(themes)

    const sentiment = entries
      .filter(e => e.sentiment_score !== null && e.sentiment_score !== undefined)
      .map(e => ({
        date: e.created_at,
        sentiment: e.sentiment_score || 0
      }))
    setSentimentData(sentiment)

    setIsLoading(false)
  }

  const extractKeywordsFromAllEntries = async () => {
    setIsGeneratingKeywords(true)

    const keywordMap = new Map<string, number>()

    for (const entry of entries) {
      if (!entry.content || entry.content.trim().length === 0) continue

      try {
        const result = await window.electronAPI.ml.extractKeywords(entry.content)
        if (result.success && result.data) {
          result.data.keywords.forEach(keyword => {
            keywordMap.set(keyword, (keywordMap.get(keyword) || 0) + 1)
          })
        }
      } catch (error) {
        console.error('Error extracting keywords for entry:', entry.id, error)
      }
    }

    const sortedKeywords = Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([keyword, count]) => ({ keyword, count }))

    setKeywordData(sortedKeywords)
    setIsGeneratingKeywords(false)
  }

  const generateThemesForAll = async () => {
    setIsGeneratingThemes(true)
    setThemesProgress({ current: 0, total: entries.length })

    setCurrentOperation('sentiment')
    const sentimentResult = await regenerateSentimentForAllEntries((current, total) => {
      setThemesProgress({ current, total })
    })

    setCurrentOperation('themes')
    setThemesProgress({ current: 0, total: entries.length })
    const themesResult = await generateThemesForAllEntries(entries, (current, total) => {
      setThemesProgress({ current, total })
    })

    setIsGeneratingThemes(false)
    setThemesProgress({ current: 0, total: 0 })
    setCurrentOperation(null)

    const themes = await getTopThemes(10)
    setThemeData(themes)

    const sentiment = entries
      .filter(e => e.sentiment_score !== null && e.sentiment_score !== undefined)
      .map(e => ({
        date: e.created_at,
        sentiment: e.sentiment_score || 0
      }))
    setSentimentData(sentiment)

    alert(
      `Analysis complete!\n\n` +
      `Sentiment: ${sentimentResult.success} updated, ${sentimentResult.skipped} skipped, ${sentimentResult.failed} failed\n` +
      `Themes: ${themesResult.success} generated, ${themesResult.failed} failed`
    )
  }

  const calculateStats = () => {
    const totalEntries = entries.length
    const totalWords = entries.reduce((sum, e) => sum + (e.word_count || 0), 0)

    const dates = entries
      .map(e => e.created_at)
      .filter(d => d !== null && d !== undefined)
      .sort((a, b) => a - b)

    const dateRange = dates.length > 0
      ? { earliest: dates[0], latest: dates[dates.length - 1] }
      : null

    return { totalEntries, totalWords, dateRange }
  }

  const stats = calculateStats()

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b border-slate-200 p-4 bg-white">
          <h2 className="text-lg font-semibold">Insights & Analytics</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">Loading insights...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-slate-200 p-4 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold">Insights & Analytics</h2>
            {isGeneratingThemes && currentOperation && (
              <span className="text-sm text-slate-500">
                {currentOperation === 'sentiment' ? 'Analyzing sentiment' : 'Generating themes'}: {themesProgress.current}/{themesProgress.total} entries
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={generateThemesForAll}
              variant="outline"
              size="sm"
              disabled={isGeneratingThemes || entries.length === 0}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isGeneratingThemes ? 'Analyzing...' : 'Generate All Themes'}
            </Button>
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <WritingStats
            totalEntries={stats.totalEntries}
            totalWords={stats.totalWords}
            dateRange={stats.dateRange}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ThemeDistributionChart data={themeData} />

            <SentimentTrendChart data={sentimentData} />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Keywords</CardTitle>
                <Button
                  onClick={extractKeywordsFromAllEntries}
                  disabled={isGeneratingKeywords || entries.length === 0}
                  size="sm"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  {isGeneratingKeywords ? 'Extracting...' : 'Extract Keywords'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {keywordData.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {keywordData.map((item, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                    >
                      {item.keyword} ({item.count})
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Click "Extract Keywords" to analyze your entries and find common topics.
                </p>
              )}
            </CardContent>
          </Card>

          {entries.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-2">
                  <BarChart3 className="h-12 w-12 text-gray-300 mx-auto" />
                  <p className="text-gray-600">No entries yet</p>
                  <p className="text-sm text-gray-500">
                    Start journaling to see your insights and analytics
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
