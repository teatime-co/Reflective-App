import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface ThemeData {
  theme_name: string
  count: number
}

interface ThemeDistributionChartProps {
  data: ThemeData[]
}

export function ThemeDistributionChart({ data }: ThemeDistributionChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No themes generated yet. Create themes for your entries to see distribution.</p>
        </CardContent>
      </Card>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Theme Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{item.theme_name}</span>
                <span className="text-gray-500">{item.count} {item.count === 1 ? 'entry' : 'entries'}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(item.count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
