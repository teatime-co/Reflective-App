import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'

interface KeywordData {
  keyword: string
  count: number
}

interface KeywordsCloudProps {
  data: KeywordData[]
}

export function KeywordsCloud({ data }: KeywordsCloudProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Keywords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No keywords extracted yet.</p>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))

  const getFontSize = (count: number) => {
    const ratio = count / maxCount
    if (ratio > 0.7) return 'text-xl'
    if (ratio > 0.4) return 'text-lg'
    return 'text-base'
  }

  const getOpacity = (count: number) => {
    const ratio = count / maxCount
    if (ratio > 0.7) return 'opacity-100'
    if (ratio > 0.4) return 'opacity-80'
    return 'opacity-60'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Keywords</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={`${getFontSize(item.count)} ${getOpacity(item.count)} transition-all hover:scale-105`}
            >
              {item.keyword} ({item.count})
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
